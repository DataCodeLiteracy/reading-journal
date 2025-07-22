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

  // 이미 로드된 세션 데이터를 사용하는 새로운 메서드
  static async getUserStatisticsWithSessions(
    user_id: string,
    readingSessions: ReadingSession[]
  ): Promise<UserStatistics | null> {
    try {
      console.log(
        "UserStatisticsService.getUserStatisticsWithSessions called with user_id:",
        user_id,
        "sessions count:",
        readingSessions.length
      )

      // 세션이 제공되면 항상 새로 계산
      console.log("Calculating statistics with provided sessions")
      const calculatedStats = await this.calculateUserStatistics(
        user_id,
        readingSessions
      )

      const result = await ApiClient.getDocument<UserStatistics>(
        "userStatistics",
        user_id
      )

      // 기존 데이터와 새로 계산한 데이터를 병합
      const updatedStats: UserStatistics = {
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
        ...result,
        ...calculatedStats,
        updated_at: new Date(),
      }

      // 직접 ApiClient를 사용하여 업데이트
      await ApiClient.updateDocument("userStatistics", user_id, updatedStats)

      console.log("Updated statistics:", updatedStats)
      return updatedStats
    } catch (error) {
      console.error(
        "UserStatisticsService.getUserStatisticsWithSessions error:",
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

      if (result) {
        // 누락된 필드들이 있는지 확인하고 계산해서 채워넣기
        const { ReadingSessionService } = await import(
          "./readingSessionService"
        )
        const allSessions = await ReadingSessionService.getUserReadingSessions(
          user_id
        )

        // 기존 통계에 누락된 필드들이 있으면 새로 계산
        if (
          result.longestSessionTime === undefined ||
          result.averageDailyTime === undefined ||
          result.daysWithSessions === undefined ||
          result.longestStreak === undefined ||
          result.monthlyReadingTime === undefined
        ) {
          console.log("Recalculating missing statistics fields")
          const calculatedStats = await this.calculateUserStatistics(
            user_id,
            allSessions
          )

          // 기존 데이터와 새로 계산한 데이터를 병합
          const updatedStats = {
            ...result,
            ...calculatedStats,
            updated_at: new Date(),
          }

          // 직접 ApiClient를 사용하여 업데이트 (무한 루프 방지)
          await ApiClient.updateDocument(
            "userStatistics",
            user_id,
            updatedStats
          )
          return updatedStats
        }
      }

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

      // 가장 긴 독서일 계산 (특정 날짜의 총 독서 시간이 가장 긴 날)
      const longestDayTime = Math.max(...Object.values(dailyReadingTime))

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

      // 연속 독서일 계산 (전체 기간에서)
      const allUniqueDates = [
        ...new Set(readingSessions.map((s) => s.date)),
      ].sort()
      let longestStreak = 0
      let currentStreak = 0
      let lastDate: string | null = null

      for (const date of allUniqueDates) {
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
      let currentReadingStreak = 0
      let checkDate = today

      while (allUniqueDates.includes(checkDate)) {
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
        longestSessionTime: longestDayTime, // 가장 긴 독서일로 수정
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

  static async recalculateUserStatistics(user_id: string): Promise<void> {
    try {
      console.log(
        "UserStatisticsService.recalculateUserStatistics called:",
        user_id
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
      console.log("User statistics recalculated successfully")
    } catch (error) {
      console.error(
        "UserStatisticsService.recalculateUserStatistics error:",
        error
      )
      throw error
    }
  }

  // 이미 로드된 세션 데이터를 사용하는 버전
  static async recalculateUserStatisticsWithSessions(
    user_id: string,
    readingSessions: ReadingSession[]
  ): Promise<void> {
    try {
      console.log(
        "UserStatisticsService.recalculateUserStatisticsWithSessions called:",
        user_id,
        "sessions count:",
        readingSessions.length
      )

      const updatedStatistics = await this.calculateUserStatistics(
        user_id,
        readingSessions
      )

      await this.createOrUpdateUserStatistics(user_id, updatedStatistics)
      console.log(
        "User statistics recalculated successfully with provided sessions"
      )
    } catch (error) {
      console.error(
        "UserStatisticsService.recalculateUserStatisticsWithSessions error:",
        error
      )
      throw error
    }
  }
}
