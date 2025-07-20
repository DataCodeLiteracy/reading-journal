import { ApiClient } from "@/lib/apiClient"
import { User, UserSummary, UserStatistics } from "@/types/user"

export class UserService {
  static async createOrUpdateUser(userData: Partial<User>): Promise<void> {
    if (!userData.uid) throw new Error("User ID is required")

    await ApiClient.createDocument("users", userData.uid, {
      ...userData,
      updated_at: ApiClient.getServerTimestamp(),
    })
  }

  static async getUser(uid: string): Promise<User | null> {
    return await ApiClient.getDocument<User>("users", uid)
  }

  static async createOrUpdateUserSummary(
    user_id: string,
    summary: Partial<UserSummary>
  ): Promise<void> {
    try {
      const existingSummary = await this.getUserSummary(user_id)

      if (existingSummary) {
        await ApiClient.updateDocument("userSummary", user_id, {
          ...summary,
          updated_at: ApiClient.getServerTimestamp(),
        })
      } else {
        await ApiClient.createDocument("userSummary", user_id, {
          ...summary,
          user_id,
          created_at: ApiClient.getServerTimestamp(),
          updated_at: ApiClient.getServerTimestamp(),
        })
      }
    } catch (error) {
      console.error("UserService.createOrUpdateUserSummary error:", error)
      throw error
    }
  }

  static async getUserSummary(user_id: string): Promise<UserSummary | null> {
    return await ApiClient.getDocument<UserSummary>("userSummary", user_id)
  }

  static async createOrUpdateUserStatistics(
    user_id: string,
    statistics: Partial<UserStatistics>
  ): Promise<void> {
    await ApiClient.createDocument("statistics", user_id, {
      ...statistics,
      user_id,
      updated_at: ApiClient.getServerTimestamp(),
    })
  }

  static async getUserStatistics(
    user_id: string
  ): Promise<UserStatistics | null> {
    return await ApiClient.getDocument<UserStatistics>("statistics", user_id)
  }
}
