import { ApiClient } from "@/lib/apiClient"
import { UserStatistics } from "@/types/user"
import { ReadingSession } from "@/types/user"

// Firestore 업데이트용 타입 (created_at, updated_at 제외)
type UserStatisticsUpdateData = Omit<Partial<UserStatistics>, "updated_at">

// Firestore에서 가져온 데이터 타입 (created_at, updated_at 포함 가능)
type UserStatisticsWithDates = UserStatistics & {
  created_at?: Date
  updated_at?: Date
}

// 통계 계산 결과 타입 (updated_at 제외)
type CalculatedStatistics = Omit<Partial<UserStatistics>, "updated_at">

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
        // updated_at은 ApiClient.updateDocument에서 자동으로 추가되므로 제거
        const dataToUpdate: UserStatisticsUpdateData = { ...statisticsData }
        if ("updated_at" in dataToUpdate) {
          delete (dataToUpdate as Partial<UserStatistics>).updated_at
        }
        await ApiClient.updateDocument<UserStatisticsUpdateData>(
          "userStatistics",
          user_id,
          dataToUpdate
        )
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
      // Date 객체는 제거하고 숫자/문자열만 포함
      const resultWithDates = result as UserStatisticsWithDates | null
      const resultData = resultWithDates
        ? (({ created_at, updated_at, ...rest }) => rest)(resultWithDates)
        : ({} as Partial<UserStatistics>)

      const updatedStats: UserStatisticsUpdateData = {
        ...resultData,
        ...calculatedStats,
      }

      // 문서가 없으면 생성, 있으면 업데이트
      if (!result) {
        await ApiClient.createDocument("userStatistics", user_id, {
          ...updatedStats,
          created_at: ApiClient.getServerTimestamp(),
          updated_at: ApiClient.getServerTimestamp(),
        })
      } else {
        // 직접 ApiClient를 사용하여 업데이트
        await ApiClient.updateDocument<UserStatisticsUpdateData>(
          "userStatistics",
          user_id,
          updatedStats
        )
      }

      // 반환할 때는 Date 객체를 포함한 형태로 변환
      const returnStats: UserStatistics = {
        ...updatedStats,
        updated_at: new Date(),
      } as UserStatistics

      console.log("Updated statistics:", returnStats)
      return returnStats
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
          // Date 객체는 제거하고 숫자/문자열만 포함
          const resultWithDates = result as UserStatisticsWithDates
          const resultData = (({ created_at, updated_at, ...rest }) => rest)(
            resultWithDates
          )

          const updatedStats: UserStatisticsUpdateData = {
            ...resultData,
            ...calculatedStats,
          }

          // 직접 ApiClient를 사용하여 업데이트 (무한 루프 방지)
          await ApiClient.updateDocument<UserStatisticsUpdateData>(
            "userStatistics",
            user_id,
            updatedStats
          )

          // 반환할 때는 Date 객체를 포함한 형태로 변환
          const returnStats: UserStatistics = {
            ...updatedStats,
            updated_at: new Date(),
          } as UserStatistics

          return returnStats
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

      // 개선된 날짜 계산 함수: 새벽 시간대 처리 (한국 시간 기준)
      const getEffectiveDate = (session: ReadingSession): string => {
        // 한국 시간 기준으로 날짜 계산
        const startTime = new Date(session.startTime)
        const koreaTime = new Date(startTime.getTime() + 9 * 60 * 60 * 1000)
        const hour = koreaTime.getUTCHours()

        // 한국 시간 기준으로 년, 월, 일 추출
        const year = koreaTime.getUTCFullYear()
        const month = String(koreaTime.getUTCMonth() + 1).padStart(2, "0")
        const day = String(koreaTime.getUTCDate()).padStart(2, "0")

        // 새벽 0시~1시에 읽은 경우 전날로 계산
        if (hour >= 0 && hour < 1) {
          const previousDay = new Date(
            koreaTime.getTime() - 24 * 60 * 60 * 1000
          )
          const prevYear = previousDay.getUTCFullYear()
          const prevMonth = String(previousDay.getUTCMonth() + 1).padStart(
            2,
            "0"
          )
          const prevDay = String(previousDay.getUTCDate()).padStart(2, "0")
          return `${prevYear}-${prevMonth}-${prevDay}`
        }

        return `${year}-${month}-${day}`
      }

      // 일일 독서 시간 계산 (개선된 날짜 기준)
      const dailyReadingTime: { [date: string]: number } = {}
      readingSessions.forEach((session) => {
        const effectiveDate = getEffectiveDate(session)
        dailyReadingTime[effectiveDate] =
          (dailyReadingTime[effectiveDate] || 0) + session.duration
      })

      const daysWithSessions = Object.keys(dailyReadingTime).length
      const averageDailyTime =
        daysWithSessions > 0
          ? Math.round(totalReadingTime / daysWithSessions)
          : 0

      // 가장 긴 독서일 계산 (특정 날짜의 총 독서 시간이 가장 긴 날)
      const longestDayTime = Math.max(...Object.values(dailyReadingTime))

      // 이번 달 독서 시간 계산 (개선된 날짜 기준)
      const now = new Date()
      const currentMonth = now.getMonth()
      const currentYear = now.getFullYear()
      const monthlySessions = readingSessions.filter((session) => {
        const effectiveDate = getEffectiveDate(session)
        const sessionDate = new Date(effectiveDate)
        return (
          sessionDate.getMonth() === currentMonth &&
          sessionDate.getFullYear() === currentYear
        )
      })
      const monthlyReadingTime = monthlySessions.reduce(
        (acc, session) => acc + session.duration,
        0
      )

      // 연속 독서일 계산 (개선된 날짜 기준)
      const allUniqueDates = [
        ...new Set(readingSessions.map((s) => getEffectiveDate(s))),
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

      // 현재 연속 독서일 계산 (자정 기준)
      const today = new Date().toISOString().split("T")[0]
      let currentReadingStreak = 0
      let checkDate = today

      // 연속 독서일 계산
      while (allUniqueDates.includes(checkDate)) {
        currentReadingStreak++
        const checkDateObj = new Date(checkDate)
        checkDateObj.setDate(checkDateObj.getDate() - 1)
        checkDate = checkDateObj.toISOString().split("T")[0]
      }

      // 자정 이후 체크: 오늘 자정이 지났고 아직 오늘 읽지 않았다면 연속이 끊어진 것으로 간주
      const nowHour = new Date().getHours()
      const isAfterMidnight = nowHour >= 0 && nowHour <= 3

      if (isAfterMidnight && !allUniqueDates.includes(today)) {
        // 자정 이후이고 오늘 읽지 않았다면 연속이 끊어진 것으로 간주
        // 하지만 아직 그날이 끝나지 않았으므로 0으로 설정하지 않고 기존 연속일 유지
        // 실제로는 다음날 자정이 지나야 연속이 끊어진 것으로 처리
        const yesterday = new Date()
        yesterday.setDate(yesterday.getDate() - 1)
        const yesterdayStr = yesterday.toISOString().split("T")[0]

        // 어제 읽지 않았다면 연속이 끊어진 것
        if (!allUniqueDates.includes(yesterdayStr)) {
          currentReadingStreak = 0
        }
      }

      const statistics: CalculatedStatistics = {
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
