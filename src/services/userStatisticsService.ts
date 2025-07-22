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
          longestSessionTime: 0,
          averageDailyTime: 0,
          daysWithSessions: 0,
          longestStreak: 0,
          monthlyReadingTime: 0,
          readingStreak: 0,
        }
      }

      const totalReadingTime = readingSessions.reduce(
        (acc, session) => acc + session.duration,
        0
      )
      const totalSessions = readingSessions.length
      const averageSessionTime = Math.round(totalReadingTime / totalSessions)
      const longestSessionTime = Math.max(
        ...readingSessions.map((s) => s.duration)
      )

      // 일일 독서 시간 계산
      const dailyReadingTime: { [date: string]: number } = {}
      readingSessions.forEach((session) => {
        const date = session.date
        dailyReadingTime[date] =
          (dailyReadingTime[date] || 0) + session.duration
      })

      const daysWithSessions = Object.keys(dailyReadingTime).length
      const averageDailyTime =
        daysWithSessions > 0
          ? Math.round(totalReadingTime / daysWithSessions)
          : 0

      // 이번 달 독서 시간 계산
      const now = new Date()
      const currentMonth = now.getMonth()
      const currentYear = now.getFullYear()
      const monthlySessions = readingSessions.filter((session) => {
        const sessionDate = new Date(session.date)
        return (
          sessionDate.getMonth() === currentMonth &&
          sessionDate.getFullYear() === currentYear
        )
      })
      const monthlyReadingTime = monthlySessions.reduce(
        (acc, session) => acc + session.duration,
        0
      )

      // 연속 독서일 계산
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      const recentSessions = readingSessions.filter((session) => {
        const sessionDate = new Date(session.date)
        return sessionDate >= thirtyDaysAgo
      })

      const uniqueDates = [...new Set(recentSessions.map((s) => s.date))].sort()
      let readingStreak = 0
      let currentStreak = 0
      let longestStreak = 0
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

        if (currentStreak > longestStreak) {
          longestStreak = currentStreak
        }

        lastDate = date
      }

      // 현재 연속 독서일 계산
      const today = new Date().toISOString().split("T")[0]
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0]

      let currentReadingStreak = 0
      let checkDate = today

      while (uniqueDates.includes(checkDate)) {
        currentReadingStreak++
        const checkDateObj = new Date(checkDate)
        checkDateObj.setDate(checkDateObj.getDate() - 1)
        checkDate = checkDateObj.toISOString().split("T")[0]
      }

      const statistics: Partial<UserStatistics> = {
        user_id,
        totalReadingTime,
        totalSessions,
        averageSessionTime,
        longestSessionTime,
        averageDailyTime,
        daysWithSessions,
        longestStreak,
        monthlyReadingTime,
        readingStreak: currentReadingStreak,
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
