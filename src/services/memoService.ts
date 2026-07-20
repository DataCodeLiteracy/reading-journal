import { ApiClient } from "@/lib/apiClient"
import type { BookMemo } from "@/types/memo"

export class MemoService {
  static async createMemo(
    memoData: Omit<BookMemo, "id" | "created_at" | "updated_at">,
  ): Promise<string> {
    return ApiClient.createDocumentWithAutoId("bookMemos", {
      ...memoData,
      created_at: ApiClient.getServerTimestamp(),
      updated_at: ApiClient.getServerTimestamp(),
    })
  }

  static async getMemo(memoId: string): Promise<BookMemo | null> {
    return ApiClient.getDocument<BookMemo>("bookMemos", memoId)
  }

  static async getBookMemos(bookId: string): Promise<BookMemo[]> {
    return ApiClient.queryDocuments<BookMemo>(
      "bookMemos",
      [["bookId", "==", bookId]],
      "created_at",
      "desc",
    )
  }

  static async getUserMemos(userId: string): Promise<BookMemo[]> {
    return ApiClient.queryDocuments<BookMemo>(
      "bookMemos",
      [["user_id", "==", userId]],
      "created_at",
      "desc",
    )
  }

  static async getPublicMemos(limitCount?: number): Promise<BookMemo[]> {
    return ApiClient.queryDocuments<BookMemo>(
      "bookMemos",
      [["isPublic", "==", true]],
      "created_at",
      "desc",
      limitCount,
    )
  }

  static async updateMemo(
    memoId: string,
    memoData: Partial<
      Omit<BookMemo, "id" | "created_at" | "updated_at" | "bookId" | "user_id">
    >,
  ): Promise<void> {
    await ApiClient.updateDocument("bookMemos", memoId, {
      ...memoData,
      updated_at: ApiClient.getServerTimestamp(),
    })
  }

  static async deleteMemo(memoId: string): Promise<void> {
    await ApiClient.deleteDocument("bookMemos", memoId)
  }
}
