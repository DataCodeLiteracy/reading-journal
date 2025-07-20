import { ApiClient } from "@/lib/apiClient"
import { ReadingSession } from "@/types/user"

export class ReadingSessionService {
  static async createReadingSession(
    sessionData: Omit<ReadingSession, "id" | "created_at" | "updated_at">
  ): Promise<string> {
    const sessionId = await ApiClient.createDocumentWithAutoId(
      "readingSessions",
      sessionData
    )
    return sessionId
  }

  static async getUserReadingSessions(
    user_id: string
  ): Promise<ReadingSession[]> {
    try {
      const result = await ApiClient.queryDocuments<ReadingSession>(
        "readingSessions",
        [["user_id", "==", user_id]]
      )
      return result
    } catch (error) {
      throw error
    }
  }

  static async getBookReadingSessions(
    bookId: string
  ): Promise<ReadingSession[]> {
    try {
      const result = await ApiClient.queryDocuments<ReadingSession>(
        "readingSessions",
        [["bookId", "==", bookId]]
      )
      return result
    } catch (error) {
      throw error
    }
  }

  static async deleteReadingSession(sessionId: string): Promise<void> {
    try {
      await ApiClient.deleteDocument("readingSessions", sessionId)
    } catch (error) {
      throw error
    }
  }
}
