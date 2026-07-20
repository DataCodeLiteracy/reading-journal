import { ApiClient } from "@/lib/apiClient"
import { User, UserStatistics } from "@/types/user"

export class UserService {
  static async createOrUpdateUser(userData: Partial<User>): Promise<void> {
    if (!userData.uid) throw new Error("User ID is required")

    // merge: 로그인 등에서 일부 필드만 넘겨도 isAdmin 등 기존 필드가 삭제되지 않도록 함
    await ApiClient.createDocument(
      "users",
      userData.uid,
      {
        ...userData,
        updated_at: ApiClient.getServerTimestamp(),
      },
      { merge: true }
    )
  }

  static async getUser(uid: string): Promise<User | null> {
    return await ApiClient.getDocument<User>("users", uid)
  }

  static async updateUserProfile(
    uid: string,
    profile: Partial<
      Pick<
        User,
        | "displayName"
        | "phoneNumber"
        | "birthYear"
        | "gender"
        | "bio"
        | "region"
      >
    >,
  ): Promise<void> {
    await this.createOrUpdateUser({ uid, ...profile })
  }

  /** 로그인 시: 기존 유저는 lastLoginAt만, 신규는 Google 프로필 포함 생성 */
  static async syncUserOnLogin(firebaseUser: {
    uid: string
    email: string | null
    displayName: string | null
    photoURL: string | null
    emailVerified: boolean
    phoneNumber: string | null
  }): Promise<void> {
    const existing = await this.getUser(firebaseUser.uid)

    if (existing) {
      await this.createOrUpdateUser({
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        emailVerified: firebaseUser.emailVerified,
        lastLoginAt: new Date(),
        isActive: true,
      })
      return
    }

    await this.createOrUpdateUser({
      uid: firebaseUser.uid,
      email: firebaseUser.email,
      displayName: firebaseUser.displayName,
      photoURL: firebaseUser.photoURL,
      emailVerified: firebaseUser.emailVerified,
      phoneNumber: firebaseUser.phoneNumber,
      lastLoginAt: new Date(),
      isActive: true,
      isAdmin: false,
      levelDataMigrated: false,
      created_at: new Date(),
    })
  }

  /** 관리자용: 전체 유저 목록 (users + 서재만 있는 user_id) */
  static async getAllUsersForAdmin(): Promise<
    { uid: string; displayName: string | null; email: string | null }[]
  > {
    const { BookService } = await import("@/services/bookService")
    const [list, books] = await Promise.all([
      ApiClient.queryDocuments<User & { id?: string }>("users", []),
      BookService.getAllBooks(5000),
    ])

    const byUid = new Map<
      string,
      { uid: string; displayName: string | null; email: string | null }
    >()

    for (const doc of list) {
      const d = doc as User & { id?: string }
      const uid = (d.uid ?? d.id ?? "").trim()
      if (!uid) continue
      byUid.set(uid, {
        uid,
        displayName: d.displayName ?? null,
        email: d.email ?? null,
      })
    }

    for (const book of books) {
      const uid = book.user_id?.trim()
      if (!uid) continue
      if (!byUid.has(uid)) {
        byUid.set(uid, { uid, displayName: null, email: null })
      }
    }

    return [...byUid.values()].sort((a, b) => {
      const la = (a.displayName || a.email || a.uid).toLowerCase()
      const lb = (b.displayName || b.email || b.uid).toLowerCase()
      return la.localeCompare(lb, "ko")
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
