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
  rank?: number // 순위 (선택적)
}

export class LeaderboardService {
  /**
   * 전체 유저를 가져와서 정렬 (레벨 기준)
   * 한 번에 모든 유저를 조회하여 정렬하고 순위를 계산
   */
  static async getAllUsersSorted(): Promise<LeaderboardUser[]> {
    try {
      // users 컬렉션에서 모든 유저 조회 (Firestore 최대 제한: 1000개)
      const allUsers = await ApiClient.queryDocuments<User>(
        "users",
        [],
        "level",
        "desc",
        1000
      )

      // 레벨이 있고 경험치가 있는 사용자만 필터링
      const validUsers = allUsers.filter(
        (user) => user.level && user.level > 0 && user.experience !== undefined
      )

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

      // LeaderboardUser 형식으로 변환하고 순위 추가
      const leaderboardUsers: LeaderboardUser[] = sortedUsers.map((user, index) => ({
        user_id: user.uid,
        displayName: user.displayName || user.email || "익명",
        photoURL: user.photoURL || undefined,
        level: user.level || 1,
        experience: user.experience || 0,
        totalReadingTime: user.totalReadingTime || 0,
        rank: index + 1, // 순위 추가
      }))

      return leaderboardUsers
    } catch (error) {
      console.error("LeaderboardService.getAllUsersSorted error:", error)
      return []
    }
  }

  /**
   * 상위 유저 조회 (레벨 기준) - 메인 페이지용 (상위 5명만)
   * 전체 유저를 가져와서 상위 N명만 반환
   */
  static async getTopUsersByLevel(limit: number = 5): Promise<LeaderboardUser[]> {
    try {
      const allUsers = await this.getAllUsersSorted()
      return allUsers.slice(0, limit)
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
   * 전체 유저를 가져와서 정렬한 후 페이지네이션과 검색 지원
   */
  static async getRankedUsersPaginated(
    page: number = 1,
    itemsPerPage: number = 20,
    searchQuery?: string
  ): Promise<{ users: LeaderboardUser[]; total: number }> {
    try {
      // 전체 유저를 한 번에 조회하여 정렬
      let allUsers = await this.getAllUsersSorted()

      // 검색어가 있으면 필터링
      if (searchQuery && searchQuery.trim()) {
        const searchLower = searchQuery.toLowerCase().trim()
        allUsers = allUsers.filter((user) => {
          const displayName = user.displayName.toLowerCase()
          return displayName.includes(searchLower)
        })
      }

      const total = allUsers.length
      const startIndex = (page - 1) * itemsPerPage
      const endIndex = startIndex + itemsPerPage
      const paginatedUsers = allUsers.slice(startIndex, endIndex)

      return { users: paginatedUsers, total }
    } catch (error) {
      console.error("LeaderboardService.getRankedUsersPaginated error:", error)
      return { users: [], total: 0 }
    }
  }

  /**
   * 특정 유저의 순위 정보 가져오기 (레벨 기준)
   */
  static async getUserRankInfo(userId: string): Promise<LeaderboardUser | null> {
    try {
      const user = await UserService.getUser(userId)
      if (!user || !user.level || user.level <= 0 || user.experience === undefined) {
        return null
      }

      return {
        user_id: user.uid,
        displayName: user.displayName || user.email || "익명",
        photoURL: user.photoURL || undefined,
        level: user.level || 1,
        experience: user.experience || 0,
        totalReadingTime: user.totalReadingTime || 0,
      }
    } catch (error) {
      console.error("LeaderboardService.getUserRankInfo error:", error)
      return null
    }
  }
}

