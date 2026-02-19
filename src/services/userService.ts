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

  /** 관리자용: 전체 유저 목록 (uid, displayName, email) */
  static async getAllUsersForAdmin(): Promise<
    { uid: string; displayName: string | null; email: string | null }[]
  > {
    const list = await ApiClient.queryDocuments<User & { id?: string }>(
      "users",
      []
    )
    return list.map((doc) => {
      const d = doc as User & { id?: string }
      return {
        uid: d.id ?? d.uid ?? "",
        displayName: d.displayName ?? null,
        email: d.email ?? null,
      }
    })
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
