import { ApiClient } from "@/lib/apiClient"
import { User } from "@/types/user"
import { UserService } from "./userService"

export interface LeaderboardUser {
  user_id: string
  displayName: string
  photoURL?: string
  level: number
  experience: number
  totalReadingTime: number
}

export class LeaderboardService {
  /**
   * 상위 유저 조회 (레벨 기준) - 메인 페이지용 (상위 5명만)
   * users 컬렉션에서 직접 조회
   */
  static async getTopUsersByLevel(limit: number = 5): Promise<LeaderboardUser[]> {
    try {
      // users 컬렉션에서 레벨 기준으로 조회
      const allUsers = await ApiClient.queryDocuments<User>(
        "users",
        [],
        "level",
        "desc",
        limit * 3 // 필터링을 위해 여유있게 가져오기
      )

      // 레벨이 있고 경험치가 있는 사용자만 필터링
      const validUsers = allUsers.filter(
        (user) => user.level && user.level > 0 && user.experience !== undefined
      )

      // 레벨, 경험치, 총 독서 시간 순으로 정렬
      const sortedUsers = validUsers
        .sort((a, b) => {
          // 1순위: 레벨
          if (b.level! !== a.level!) {
            return b.level! - a.level!
          }
          // 2순위: 경험치
          if (b.experience! !== a.experience!) {
            return b.experience! - a.experience!
          }
          // 3순위: 총 독서 시간
          return (b.totalReadingTime || 0) - (a.totalReadingTime || 0)
        })
        .slice(0, limit)

      // LeaderboardUser 형식으로 변환
      const leaderboardUsers: LeaderboardUser[] = sortedUsers.map((user) => ({
        user_id: user.uid,
        displayName: user.displayName || user.email || "익명",
        photoURL: user.photoURL || undefined,
        level: user.level || 1,
        experience: user.experience || 0,
        totalReadingTime: user.totalReadingTime || 0,
      }))

      return leaderboardUsers
    } catch (error) {
      console.error("LeaderboardService.getTopUsersByLevel error:", error)
      return []
    }
  }

  /**
   * 상위 유저 조회 (경험치 기준)
   * users 컬렉션에서 직접 조회
   */
  static async getTopUsersByExperience(limit: number = 5): Promise<LeaderboardUser[]> {
    try {
      const allUsers = await ApiClient.queryDocuments<User>(
        "users",
        [],
        "experience",
        "desc",
        limit * 3
      )

      const validUsers = allUsers.filter(
        (user) => user.experience !== undefined && user.experience > 0
      )

      const sortedUsers = validUsers
        .sort((a, b) => {
          if (b.experience! !== a.experience!) {
            return b.experience! - a.experience!
          }
          if (b.level! !== a.level!) {
            return b.level! - a.level!
          }
          return (b.totalReadingTime || 0) - (a.totalReadingTime || 0)
        })
        .slice(0, limit)

      return sortedUsers.map((user) => ({
        user_id: user.uid,
        displayName: user.displayName || user.email || "익명",
        photoURL: user.photoURL || undefined,
        level: user.level || 1,
        experience: user.experience || 0,
        totalReadingTime: user.totalReadingTime || 0,
      }))
    } catch (error) {
      console.error("LeaderboardService.getTopUsersByExperience error:", error)
      return []
    }
  }

  /**
   * 상위 유저 조회 (총 독서 시간 기준)
   * users 컬렉션에서 직접 조회
   */
  static async getTopUsersByReadingTime(limit: number = 5): Promise<LeaderboardUser[]> {
    try {
      const allUsers = await ApiClient.queryDocuments<User>(
        "users",
        [],
        "totalReadingTime",
        "desc",
        limit * 3
      )

      const validUsers = allUsers.filter(
        (user) => user.totalReadingTime && user.totalReadingTime > 0
      )

      const sortedUsers = validUsers
        .sort((a, b) => {
          if ((b.totalReadingTime || 0) !== (a.totalReadingTime || 0)) {
            return (b.totalReadingTime || 0) - (a.totalReadingTime || 0)
          }
          if (b.level! !== a.level!) {
            return b.level! - a.level!
          }
          return (b.experience || 0) - (a.experience || 0)
        })
        .slice(0, limit)

      return sortedUsers.map((user) => ({
        user_id: user.uid,
        displayName: user.displayName || user.email || "익명",
        photoURL: user.photoURL || undefined,
        level: user.level || 1,
        experience: user.experience || 0,
        totalReadingTime: user.totalReadingTime || 0,
      }))
    } catch (error) {
      console.error("LeaderboardService.getTopUsersByReadingTime error:", error)
      return []
    }
  }

  /**
   * 통합 상위 유저 조회 (기본: 레벨 기준)
   */
  static async getTopUsers(
    limit: number = 5,
    sortBy: "level" | "experience" | "readingTime" = "level"
  ): Promise<LeaderboardUser[]> {
    switch (sortBy) {
      case "level":
        return this.getTopUsersByLevel(limit)
      case "experience":
        return this.getTopUsersByExperience(limit)
      case "readingTime":
        return this.getTopUsersByReadingTime(limit)
      default:
        return this.getTopUsersByLevel(limit)
    }
  }

  /**
   * 페이지네이션된 레벨 순위 조회 - 전체 순위 페이지용
   * users 컬렉션에서 직접 조회하고 페이지네이션과 검색 지원
   */
  static async getRankedUsersPaginated(
    page: number = 1,
    itemsPerPage: number = 20,
    searchQuery?: string
  ): Promise<{ users: LeaderboardUser[]; total: number }> {
    try {
      // users 컬렉션에서 레벨 기준으로 조회 (Firestore 최대 제한: 1000개)
      const allUsers = await ApiClient.queryDocuments<User>(
        "users",
        [],
        "level",
        "desc",
        1000 // Firestore 기본 제한
      )

      console.log("[LeaderboardService.getRankedUsersPaginated] 전체 유저 조회:", {
        totalUsers: allUsers.length,
      })

      // 레벨이 있고 경험치가 있는 사용자만 필터링
      let validUsers = allUsers.filter(
        (user) => user.level && user.level > 0 && user.experience !== undefined
      )

      console.log("[LeaderboardService.getRankedUsersPaginated] 유효한 유저:", {
        validCount: validUsers.length,
      })

      // 검색어가 있으면 필터링
      if (searchQuery && searchQuery.trim()) {
        const searchLower = searchQuery.toLowerCase().trim()
        validUsers = validUsers.filter((user) => {
          const displayName = (user.displayName || user.email || "익명").toLowerCase()
          return displayName.includes(searchLower)
        })
        
        console.log("[LeaderboardService.getRankedUsersPaginated] 검색 결과:", {
          searchQuery,
          matchedCount: validUsers.length,
        })
      }

      // 레벨, 경험치, 총 독서 시간 순으로 정렬
      const sortedUsers = validUsers.sort((a, b) => {
        // 1순위: 레벨
        if (b.level! !== a.level!) {
          return b.level! - a.level!
        }
        // 2순위: 경험치
        if (b.experience! !== a.experience!) {
          return b.experience! - a.experience!
        }
        // 3순위: 총 독서 시간
        return (b.totalReadingTime || 0) - (a.totalReadingTime || 0)
      })

      const total = sortedUsers.length
      const startIndex = (page - 1) * itemsPerPage
      const endIndex = startIndex + itemsPerPage
      const paginatedUsers = sortedUsers.slice(startIndex, endIndex)

      console.log("[LeaderboardService.getRankedUsersPaginated] 페이지네이션:", {
        page,
        itemsPerPage,
        total,
        startIndex,
        endIndex,
        paginatedCount: paginatedUsers.length,
      })

      // LeaderboardUser 형식으로 변환
      const leaderboardUsers: LeaderboardUser[] = paginatedUsers.map((user) => ({
        user_id: user.uid,
        displayName: user.displayName || user.email || "익명",
        photoURL: user.photoURL || undefined,
        level: user.level || 1,
        experience: user.experience || 0,
        totalReadingTime: user.totalReadingTime || 0,
      }))

      console.log("[LeaderboardService.getRankedUsersPaginated] 최종 결과:", {
        usersCount: leaderboardUsers.length,
        total,
      })

      return { users: leaderboardUsers, total }
    } catch (error) {
      console.error("LeaderboardService.getRankedUsersPaginated error:", error)
      return { users: [], total: 0 }
    }
  }
}

