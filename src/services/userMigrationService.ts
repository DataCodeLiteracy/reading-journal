import { ApiClient } from "@/lib/apiClient"
import { User, UserStatistics } from "@/types/user"
import { UserService } from "./userService"
import { UserStatisticsService } from "./userStatisticsService"
import { calculateLevelInfo } from "@/utils/experienceSystem"

/**
 * 1회성 마이그레이션 서비스
 * 모든 유저의 레벨, 경험치, 총 독서시간을 users 컬렉션에 저장
 */
export class UserMigrationService {
  /**
   * 모든 유저의 레벨 데이터를 users 컬렉션에 마이그레이션
   * 로그인 시 1회만 실행
   */
  static async migrateAllUsersLevelData(): Promise<void> {
    try {
      console.log("[UserMigrationService] 마이그레이션 시작")

      // 모든 userStatistics 조회
      const allStats = await ApiClient.queryDocuments<UserStatistics>(
        "userStatistics",
        [],
        "level",
        "desc",
        1000
      )

      console.log("[UserMigrationService] 조회된 통계 수:", allStats.length)

      // 각 유저의 레벨 데이터를 users 컬렉션에 저장
      const migrationPromises = allStats.map(async (stat) => {
        try {
          // users 컬렉션에서 유저 정보 가져오기
          const user = await UserService.getUser(stat.user_id)
          
          if (!user) {
            console.warn(`[UserMigrationService] 유저를 찾을 수 없음: ${stat.user_id}`)
            return
          }

          // 이미 마이그레이션되었는지 확인
          if (user.levelDataMigrated) {
            console.log(`[UserMigrationService] 이미 마이그레이션됨: ${stat.user_id}`)
            return
          }

          // 레벨 데이터 계산 (보너스 경험치 포함)
          const bonusExperience = (stat.totalLikesReceived || 0) * 10 + (stat.totalCommentsWritten || 0) * 5
          const levelInfo = calculateLevelInfo(
            stat.totalReadingTime || 0,
            bonusExperience
          )

          // users 컬렉션 업데이트
          await ApiClient.updateDocument<Partial<User>>(
            "users",
            stat.user_id,
            {
              level: levelInfo.level,
              experience: levelInfo.experience,
              totalReadingTime: stat.totalReadingTime || 0,
              levelDataMigrated: true,
            }
          )

          console.log(`[UserMigrationService] 마이그레이션 완료: ${stat.user_id}`, {
            level: levelInfo.level,
            experience: levelInfo.experience,
            totalReadingTime: stat.totalReadingTime || 0,
          })
        } catch (error) {
          console.error(`[UserMigrationService] 마이그레이션 실패: ${stat.user_id}`, error)
        }
      })

      await Promise.all(migrationPromises)
      console.log("[UserMigrationService] 전체 마이그레이션 완료")
    } catch (error) {
      console.error("[UserMigrationService] 마이그레이션 오류:", error)
      throw error
    }
  }

  /**
   * 현재 로그인한 유저의 레벨 데이터를 users 컬렉션에 저장
   * 로그인 시 1회만 실행
   */
  static async migrateCurrentUserLevelData(userId: string): Promise<void> {
    try {
      // users 컬렉션에서 유저 정보 가져오기
      const user = await UserService.getUser(userId)
      
      if (!user) {
        console.warn(`[UserMigrationService] 유저를 찾을 수 없음: ${userId}`)
        return
      }

      // 이미 마이그레이션되었는지 확인
      if (user.levelDataMigrated) {
        console.log(`[UserMigrationService] 이미 마이그레이션됨: ${userId}`)
        return
      }

      // userStatistics에서 통계 가져오기
      const stats = await UserStatisticsService.getUserStatistics(userId)
      
      if (!stats) {
        console.warn(`[UserMigrationService] 통계를 찾을 수 없음: ${userId}`)
        return
      }

      // 레벨 데이터 계산 (보너스 경험치 포함)
      const bonusExperience = (stats.totalLikesReceived || 0) * 10 + (stats.totalCommentsWritten || 0) * 5
      const levelInfo = calculateLevelInfo(
        stats.totalReadingTime || 0,
        bonusExperience
      )

      // users 컬렉션 업데이트
      await ApiClient.updateDocument<Partial<User>>(
        "users",
        userId,
        {
          level: levelInfo.level,
          experience: levelInfo.experience,
          totalReadingTime: stats.totalReadingTime || 0,
          levelDataMigrated: true,
        }
      )

      console.log(`[UserMigrationService] 마이그레이션 완료: ${userId}`, {
        level: levelInfo.level,
        experience: levelInfo.experience,
        totalReadingTime: stats.totalReadingTime || 0,
      })
    } catch (error) {
      console.error(`[UserMigrationService] 마이그레이션 오류: ${userId}`, error)
      throw error
    }
  }
}

