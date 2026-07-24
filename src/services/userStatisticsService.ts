import { ApiClient } from "@/lib/apiClient"
import { UserStatistics, User } from "@/types/user"
import { ReadingSession } from "@/types/user"
import {
  calculateLevelInfo,
  readingTimeToExperience,
  calculateLevel,
  roundExperience,
} from "@/utils/experienceSystem"
import { getKoreaDate, getKoreaDateFromISO } from "@/utils/timeUtils"
import { UserService } from "./userService"

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
        
        // users 컬렉션도 함께 업데이트 (레벨, 경험치, 총 독서시간이 있는 경우)
        if (dataToUpdate.level !== undefined || dataToUpdate.experience !== undefined || dataToUpdate.totalReadingTime !== undefined) {
          try {
            const userUpdateData: Partial<User> = {}
            if (dataToUpdate.level !== undefined) userUpdateData.level = dataToUpdate.level
            if (dataToUpdate.experience !== undefined) userUpdateData.experience = dataToUpdate.experience
            if (dataToUpdate.totalReadingTime !== undefined) userUpdateData.totalReadingTime = dataToUpdate.totalReadingTime
            
            await ApiClient.updateDocument<Partial<User>>(
              "users",
              user_id,
              userUpdateData
            )
          } catch (error) {
            console.warn("Failed to update users collection:", error)
          }
        }
        
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

      // Firestore에 안전한 값만 전달 (Date, NaN 등 제거)
      const safeStats: Record<string, unknown> = {}
      for (const [key, value] of Object.entries(updatedStats)) {
        if (value === undefined) continue
        if ((value as unknown) instanceof Date) continue
        if (typeof value === "number" && (Number.isNaN(value) || !Number.isFinite(value))) continue
        safeStats[key] = value
      }

      // 문서가 없으면 생성, 있으면 업데이트
      if (!result) {
        await ApiClient.createDocument("userStatistics", user_id, {
          ...safeStats,
          user_id,
          created_at: ApiClient.getServerTimestamp(),
          updated_at: ApiClient.getServerTimestamp(),
        } as any)
      } else {
        // 직접 ApiClient를 사용하여 업데이트
        await ApiClient.updateDocument<Record<string, unknown>>(
          "userStatistics",
          user_id,
          safeStats
        )
      }

      // users 컬렉션도 함께 업데이트 (레벨, 경험치, 총 독서시간이 있는 경우)
      const safeLevel = safeStats.level as number | undefined
      const safeExperience = safeStats.experience as number | undefined
      const safeTotalReadingTime = safeStats.totalReadingTime as number | undefined
      if (safeLevel !== undefined && safeExperience !== undefined && safeTotalReadingTime !== undefined) {
        try {
          await ApiClient.updateDocument<Partial<User>>(
            "users",
            user_id,
            {
              level: safeLevel,
              experience: safeExperience,
              totalReadingTime: safeTotalReadingTime,
            }
          )
        } catch (error) {
          console.warn("Failed to update users collection:", error)
        }
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
        // 기존 통계에서 보너스 경험치 정보 가져오기
        const existingStats = await this.getUserStatistics(user_id)
        const bonusExp = this.calculateBonusExperience(
          existingStats?.totalLikesReceived || 0,
          existingStats?.totalCommentsWritten || 0,
          existingStats?.transcriptionBonusExp || 0
        )
        const levelInfo = calculateLevelInfo(0, bonusExp)

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
          level: levelInfo.level,
          experience: levelInfo.experience,
        }
      }

      const totalReadingTime = readingSessions.reduce(
        (acc, session) => acc + session.duration,
        0
      )
      const totalSessions = readingSessions.length
      const averageSessionTime = Math.round(totalReadingTime / totalSessions)

      // 한국 시간(KST) 기준 날짜: startTime(UTC ISO) → YYYY-MM-DD (00:00~23:59 KST = 그날)
      const getEffectiveDate = (session: ReadingSession): string =>
        getKoreaDateFromISO(session.startTime)

      // 일일 독서 시간 계산 (한국 날짜 기준)
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

      // 이번 달 독서 시간 계산 (한국 시간 기준 년/월)
      const koreaTodayStr = getKoreaDate(new Date())
      const [koreaYearStr, koreaMonthStr] = koreaTodayStr.split("-")
      const currentYear = parseInt(koreaYearStr!, 10)
      const currentMonth = parseInt(koreaMonthStr!, 10) - 1 // 0-indexed
      const monthlySessions = readingSessions.filter((session) => {
        const effectiveDate = getEffectiveDate(session)
        const sessionDate = new Date(effectiveDate + "T12:00:00")
        return (
          sessionDate.getFullYear() === currentYear &&
          sessionDate.getMonth() === currentMonth
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

      // 현재 연속 독서일 계산 (한국 날짜 기준)
      const today = getKoreaDate(new Date())
      let currentReadingStreak = 0
      let checkDate = today

      // 연속 독서일 계산
      while (allUniqueDates.includes(checkDate)) {
        currentReadingStreak++
        const checkDateObj = new Date(checkDate + "T12:00:00")
        checkDateObj.setDate(checkDateObj.getDate() - 1)
        checkDate = checkDateObj.getFullYear() + "-" + String(checkDateObj.getMonth() + 1).padStart(2, "0") + "-" + String(checkDateObj.getDate()).padStart(2, "0")
      }

      // 자정 이후: 한국 시간 기준 오늘 읽지 않았고 어제도 읽지 않았으면 연속 끊김
      const koreaNow = new Date(Date.now() + 9 * 60 * 60 * 1000)
      const nowHour = koreaNow.getUTCHours()
      const isAfterMidnight = nowHour >= 0 && nowHour <= 3

      if (isAfterMidnight && !allUniqueDates.includes(today)) {
        const yesterdayObj = new Date(today + "T12:00:00")
        yesterdayObj.setDate(yesterdayObj.getDate() - 1)
        const yesterdayStr =
          yesterdayObj.getFullYear() +
          "-" +
          String(yesterdayObj.getMonth() + 1).padStart(2, "0") +
          "-" +
          String(yesterdayObj.getDate()).padStart(2, "0")
        if (!allUniqueDates.includes(yesterdayStr)) {
          currentReadingStreak = 0
        }
      }

      // 기존 통계에서 보너스 경험치 정보 가져오기
      const existingStats = await this.getUserStatistics(user_id)
      const bonusExp = this.calculateBonusExperience(
        existingStats?.totalLikesReceived || 0,
        existingStats?.totalCommentsWritten || 0,
        existingStats?.transcriptionBonusExp || 0
      )

      // 레벨 및 경험치 계산
      const levelInfo = calculateLevelInfo(totalReadingTime, bonusExp)

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
        level: levelInfo.level,
        experience: levelInfo.experience,
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
      
      // users 컬렉션도 함께 업데이트
      if (updatedStatistics.level !== undefined && updatedStatistics.experience !== undefined && updatedStatistics.totalReadingTime !== undefined) {
        try {
          await ApiClient.updateDocument<Partial<User>>(
            "users",
            user_id,
            {
              level: updatedStatistics.level,
              experience: updatedStatistics.experience,
              totalReadingTime: updatedStatistics.totalReadingTime,
            }
          )
        } catch (error) {
          console.warn("Failed to update users collection:", error)
        }
      }
      
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
      
      // users 컬렉션도 함께 업데이트
      if (updatedStatistics.level !== undefined && updatedStatistics.experience !== undefined && updatedStatistics.totalReadingTime !== undefined) {
        try {
          await ApiClient.updateDocument<Partial<User>>(
            "users",
            user_id,
            {
              level: updatedStatistics.level,
              experience: updatedStatistics.experience,
              totalReadingTime: updatedStatistics.totalReadingTime,
            }
          )
        } catch (error) {
          console.warn("Failed to update users collection:", error)
        }
      }
      
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

  /**
   * 보너스 경험치 계산 (좋아요, 댓글, 필사)
   * 좋아요 1개 = 10 EXP, 댓글 1개 = 5 EXP, 필사는 누적 transcriptionBonusExp
   */
  static calculateBonusExperience(
    totalLikesReceived: number,
    totalCommentsWritten: number,
    transcriptionBonusExp: number = 0
  ): number {
    const LIKE_EXP = 10 // 좋아요 1개당 경험치
    const COMMENT_EXP = 5 // 댓글 1개당 경험치

    return roundExperience(
      totalLikesReceived * LIKE_EXP +
        totalCommentsWritten * COMMENT_EXP +
        Math.max(0, transcriptionBonusExp)
    )
  }

  /**
   * 레벨 및 경험치 업데이트
   * 독서 시간과 보너스 경험치를 기반으로 레벨을 재계산합니다.
   */
  static async updateLevelAndExperience(
    user_id: string,
    totalReadingTime: number,
    totalLikesReceived?: number,
    totalCommentsWritten?: number
  ): Promise<{ level: number; experience: number }> {
    try {
      const existingStats = await this.getUserStatistics(user_id)
      const likes =
        totalLikesReceived ?? existingStats?.totalLikesReceived ?? 0
      const comments =
        totalCommentsWritten ?? existingStats?.totalCommentsWritten ?? 0
      const transcriptionBonus = existingStats?.transcriptionBonusExp || 0

      const bonusExp = this.calculateBonusExperience(
        likes,
        comments,
        transcriptionBonus
      )
      const levelInfo = calculateLevelInfo(totalReadingTime, bonusExp)

      // 통계 업데이트
      await this.createOrUpdateUserStatistics(user_id, {
        level: levelInfo.level,
        experience: levelInfo.experience,
        totalLikesReceived: likes,
        totalCommentsWritten: comments,
      })

      // users 컬렉션도 함께 업데이트
      try {
        await ApiClient.updateDocument<Partial<User>>(
          "users",
          user_id,
          {
            level: levelInfo.level,
            experience: levelInfo.experience,
            totalReadingTime: totalReadingTime,
          }
        )
      } catch (error) {
        console.warn("Failed to update users collection:", error)
        // users 컬렉션 업데이트 실패해도 계속 진행
      }

      return {
        level: levelInfo.level,
        experience: levelInfo.experience,
      }
    } catch (error) {
      console.error(
        "UserStatisticsService.updateLevelAndExperience error:",
        error
      )
      throw error
    }
  }

  /**
   * 레벨 정보 조회 (진행률 포함)
   */
  static async getLevelInfo(user_id: string): Promise<{
    level: number
    experience: number
    progress: number
    expToNextLevel: number
  } | null> {
    try {
      const stats = await this.getUserStatistics(user_id)
      if (!stats) return null

      const bonusExp = this.calculateBonusExperience(
        stats.totalLikesReceived || 0,
        stats.totalCommentsWritten || 0,
        stats.transcriptionBonusExp || 0
      )
      const levelInfo = calculateLevelInfo(
        stats.totalReadingTime || 0,
        bonusExp
      )

      return {
        level: levelInfo.level,
        experience: levelInfo.experience,
        progress: levelInfo.progress,
        expToNextLevel: levelInfo.expToNextLevel,
      }
    } catch (error) {
      console.error("UserStatisticsService.getLevelInfo error:", error)
      return null
    }
  }

  /** 현재 날짜가 속한 ISO 주 문자열 반환 (예: "2026-W04") */
  static getISOWeekString(date: Date): string {
    const d = new Date(date)
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() + 4 - (d.getDay() || 7))
    const yearStart = new Date(d.getFullYear(), 0, 1)
    const weekNo = Math.ceil(
      ((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7
    )
    return `${d.getFullYear()}-W${String(weekNo).padStart(2, "0")}`
  }

  /**
   * 주간 목표 달성 보너스 경험치 지급 (목표시간×20).
   * 해당 주에 이미 지급했으면 null 반환.
   */
  static async addWeeklyGoalBonus(
    user_id: string,
    goalHours: number,
    currentWeek: string
  ): Promise<{ bonusExp: number } | null> {
    try {
      const stats = await this.getUserStatistics(user_id)
      if (!stats) return null
      if (stats.lastWeeklyBonusWeek === currentWeek) return null

      const bonusExp = goalHours * 20
      const newExperience = roundExperience((stats.experience ?? 0) + bonusExp)
      const newLevel = calculateLevel(newExperience)

      await this.createOrUpdateUserStatistics(user_id, {
        experience: newExperience,
        level: newLevel,
        lastWeeklyBonusWeek: currentWeek,
      })

      await ApiClient.updateDocument<Partial<User>>("users", user_id, {
        experience: newExperience,
        level: newLevel,
      })

      return { bonusExp }
    } catch (error) {
      console.error("UserStatisticsService.addWeeklyGoalBonus error:", error)
      return null
    }
  }

  /**
   * 타자 필사 성공 보너스 EXP 지급.
   * transcriptionBonusExp에 누적한 뒤 통합 레벨을 재계산한다.
   */
  static async addTranscriptionBonus(
    user_id: string,
    gainedExp: number
  ): Promise<{ level: number; experience: number; gainedExp: number } | null> {
    try {
      const amount = roundExperience(Math.max(0, gainedExp))
      if (amount <= 0) return null

      const stats = await this.getUserStatistics(user_id)
      if (!stats) return null

      const transcriptionBonusExp = roundExperience(
        (stats.transcriptionBonusExp || 0) + amount
      )
      const bonusExp = this.calculateBonusExperience(
        stats.totalLikesReceived || 0,
        stats.totalCommentsWritten || 0,
        transcriptionBonusExp
      )
      const levelInfo = calculateLevelInfo(
        stats.totalReadingTime || 0,
        bonusExp
      )

      await this.createOrUpdateUserStatistics(user_id, {
        transcriptionBonusExp,
        experience: levelInfo.experience,
        level: levelInfo.level,
      })

      await ApiClient.updateDocument<Partial<User>>("users", user_id, {
        experience: levelInfo.experience,
        level: levelInfo.level,
      })

      return {
        level: levelInfo.level,
        experience: levelInfo.experience,
        gainedExp: amount,
      }
    } catch (error) {
      console.error(
        "UserStatisticsService.addTranscriptionBonus error:",
        error
      )
      return null
    }
  }
}
