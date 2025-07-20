import { ApiClient } from "@/lib/apiClient"
import { UserStatistics } from "@/types/user"
import { ReadingSession } from "@/types/user"

export class UserStatisticsService {
  static async createOrUpdateUserStatistics(
    user_id: string,
    statisticsData: Partial<UserStatistics>
  ): Promise<void> {
    try {
      console.log(
        "UserStatisticsService.createOrUpdateUserStatistics called:",
        {
          user_id,
          statisticsData,
        }
      )

      const existingStats = await this.getUserStatistics(user_id)

      if (existingStats) {
        await ApiClient.updateDocument("userStatistics", user_id, {
          ...statisticsData,
          updated_at: ApiClient.getServerTimestamp(),
        })
        console.log("User statistics updated successfully")
      } else {
        await ApiClient.createDocument("userStatistics", user_id, {
          user_id,
          ...statisticsData,
          created_at: ApiClient.getServerTimestamp(),
          updated_at: ApiClient.getServerTimestamp(),
        })
        console.log("User statistics created successfully")
      }
    } catch (error) {
      console.error(
        "UserStatisticsService.createOrUpdateUserStatistics error:",
        error
      )
      throw error
    }
  }

  static async getUserStatistics(
    user_id: string
  ): Promise<UserStatistics | null> {
    try {
      console.log(
        "UserStatisticsService.getUserStatistics called with user_id:",
        user_id
      )
      const result = await ApiClient.getDocument<UserStatistics>(
        "userStatistics",
        user_id
      )
      console.log("UserStatisticsService.getUserStatistics result:", result)
      return result
    } catch (error) {
      console.error("UserStatisticsService.getUserStatistics error:", error)
      throw error
    }
  }

  static async calculateUserStatistics(
    user_id: string,
    readingSessions: ReadingSession[]
  ): Promise<Partial<UserStatistics>> {
    try {
      console.log("UserStatisticsService.calculateUserStatistics called:", {
        user_id,
        sessionsCount: readingSessions.length,
      })

      if (readingSessions.length === 0) {
        return {
          user_id,
          totalReadingTime: 0,
          totalSessions: 0,
          averageSessionTime: 0,
          readingStreak: 0,
        }
      }

      const totalReadingTime = readingSessions.reduce(
        (acc, session) => acc + session.duration,
        0
      )
      const totalSessions = readingSessions.length
      const averageSessionTime = Math.round(totalReadingTime / totalSessions)

      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      const recentSessions = readingSessions.filter((session) => {
        const sessionDate = new Date(session.date)
        return sessionDate >= thirtyDaysAgo
      })

      const uniqueDates = [...new Set(recentSessions.map((s) => s.date))].sort()
      let readingStreak = 0
      let currentStreak = 0
      let lastDate: string | null = null

      for (const date of uniqueDates) {
        if (lastDate === null) {
          currentStreak = 1
        } else {
          const lastDateObj = new Date(lastDate)
          const currentDateObj = new Date(date)
          const diffDays = Math.floor(
            (currentDateObj.getTime() - lastDateObj.getTime()) /
              (1000 * 60 * 60 * 24)
          )

          if (diffDays === 1) {
            currentStreak++
          } else {
            currentStreak = 1
          }
        }

        if (currentStreak > readingStreak) {
          readingStreak = currentStreak
        }

        lastDate = date
      }

      const statistics: Partial<UserStatistics> = {
        user_id,
        totalReadingTime,
        totalSessions,
        averageSessionTime,
        readingStreak,
        updated_at: new Date(),
      }

      console.log("Calculated statistics:", statistics)
      return statistics
    } catch (error) {
      console.error(
        "UserStatisticsService.calculateUserStatistics error:",
        error
      )
      throw error
    }
  }

  static async updateStatisticsFromReadingSession(
    user_id: string,
    newSession: ReadingSession
  ): Promise<void> {
    try {
      console.log(
        "UserStatisticsService.updateStatisticsFromReadingSession called:",
        {
          user_id,
          sessionId: newSession.id,
        }
      )

      const { ReadingSessionService } = await import("./readingSessionService")
      const allSessions = await ReadingSessionService.getUserReadingSessions(
        user_id
      )

      const updatedStatistics = await this.calculateUserStatistics(
        user_id,
        allSessions
      )

      await this.createOrUpdateUserStatistics(user_id, updatedStatistics)
      console.log("Statistics updated from reading session")
    } catch (error) {
      console.error(
        "UserStatisticsService.updateStatisticsFromReadingSession error:",
        error
      )
      throw error
    }
  }
}
