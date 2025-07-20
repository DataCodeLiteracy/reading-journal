import { ApiClient } from "@/lib/apiClient"
import { User, UserStatistics } from "@/types/user"

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
