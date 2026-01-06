import { ApiClient } from "@/lib/apiClient"
import { Critique } from "@/types/content"

export class CritiqueService {
  /**
   * 서평 생성
   */
  static async createCritique(
    critiqueData: Omit<
      Critique,
      "id" | "created_at" | "updated_at" | "likesCount" | "commentsCount"
    >
  ): Promise<string> {
    try {
      const critiqueId = await ApiClient.createDocumentWithAutoId("critiques", {
        ...critiqueData,
        likesCount: 0,
        commentsCount: 0,
        created_at: ApiClient.getServerTimestamp(),
        updated_at: ApiClient.getServerTimestamp(),
      })
      return critiqueId
    } catch (error) {
      console.error("CritiqueService.createCritique error:", error)
      throw error
    }
  }

  /**
   * 서평 조회
   */
  static async getCritique(critiqueId: string): Promise<Critique | null> {
    try {
      return await ApiClient.getDocument<Critique>("critiques", critiqueId)
    } catch (error) {
      console.error("CritiqueService.getCritique error:", error)
      return null
    }
  }

  /**
   * 책의 모든 서평 조회
   */
  static async getBookCritiques(bookId: string): Promise<Critique[]> {
    try {
      return await ApiClient.queryDocuments<Critique>(
        "critiques",
        [["bookId", "==", bookId]],
        "created_at",
        "desc"
      )
    } catch (error) {
      console.error("CritiqueService.getBookCritiques error:", error)
      return []
    }
  }

  /**
   * 사용자의 모든 서평 조회
   */
  static async getUserCritiques(user_id: string): Promise<Critique[]> {
    try {
      return await ApiClient.queryDocuments<Critique>(
        "critiques",
        [["user_id", "==", user_id]],
        "created_at",
        "desc"
      )
    } catch (error) {
      console.error("CritiqueService.getUserCritiques error:", error)
      return []
    }
  }

  /**
   * 서평 업데이트
   */
  static async updateCritique(
    critiqueId: string,
    critiqueData: Partial<
      Omit<
        Critique,
        "id" | "created_at" | "updated_at" | "likesCount" | "commentsCount"
      >
    >
  ): Promise<void> {
    try {
      await ApiClient.updateDocument("critiques", critiqueId, {
        ...critiqueData,
        updated_at: ApiClient.getServerTimestamp(),
      })
    } catch (error) {
      console.error("CritiqueService.updateCritique error:", error)
      throw error
    }
  }

  /**
   * 서평 삭제
   */
  static async deleteCritique(critiqueId: string): Promise<void> {
    try {
      await ApiClient.deleteDocument("critiques", critiqueId)
    } catch (error) {
      console.error("CritiqueService.deleteCritique error:", error)
      throw error
    }
  }

  /**
   * 공개된 서평 조회 (탐색 페이지용)
   */
  static async getPublicCritiques(limitCount?: number): Promise<Critique[]> {
    try {
      return await ApiClient.queryDocuments<Critique>(
        "critiques",
        [["isPublic", "==", true]],
        "created_at",
        "desc",
        limitCount
      )
    } catch (error) {
      console.error("CritiqueService.getPublicCritiques error:", error)
      return []
    }
  }
}

