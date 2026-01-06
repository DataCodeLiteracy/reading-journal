import { ApiClient } from "@/lib/apiClient"
import { Quote } from "@/types/content"

export class QuoteService {
  /**
   * 구절 기록 생성
   */
  static async createQuote(quoteData: Omit<Quote, "id" | "created_at" | "updated_at" | "likesCount" | "commentsCount">): Promise<string> {
    try {
      const quoteId = await ApiClient.createDocumentWithAutoId("quotes", {
        ...quoteData,
        likesCount: 0,
        commentsCount: 0,
        created_at: ApiClient.getServerTimestamp(),
        updated_at: ApiClient.getServerTimestamp(),
      })
      return quoteId
    } catch (error) {
      console.error("QuoteService.createQuote error:", error)
      throw error
    }
  }

  /**
   * 구절 기록 조회
   */
  static async getQuote(quoteId: string): Promise<Quote | null> {
    try {
      return await ApiClient.getDocument<Quote>("quotes", quoteId)
    } catch (error) {
      console.error("QuoteService.getQuote error:", error)
      return null
    }
  }

  /**
   * 책의 모든 구절 기록 조회
   */
  static async getBookQuotes(bookId: string): Promise<Quote[]> {
    try {
      return await ApiClient.queryDocuments<Quote>(
        "quotes",
        [["bookId", "==", bookId]],
        "created_at",
        "desc"
      )
    } catch (error) {
      console.error("QuoteService.getBookQuotes error:", error)
      return []
    }
  }

  /**
   * 사용자의 모든 구절 기록 조회
   */
  static async getUserQuotes(user_id: string): Promise<Quote[]> {
    try {
      return await ApiClient.queryDocuments<Quote>(
        "quotes",
        [["user_id", "==", user_id]],
        "created_at",
        "desc"
      )
    } catch (error) {
      console.error("QuoteService.getUserQuotes error:", error)
      return []
    }
  }

  /**
   * 구절 기록 업데이트
   */
  static async updateQuote(
    quoteId: string,
    quoteData: Partial<Omit<Quote, "id" | "created_at" | "updated_at" | "likesCount" | "commentsCount">>
  ): Promise<void> {
    try {
      await ApiClient.updateDocument("quotes", quoteId, {
        ...quoteData,
        updated_at: ApiClient.getServerTimestamp(),
      })
    } catch (error) {
      console.error("QuoteService.updateQuote error:", error)
      throw error
    }
  }

  /**
   * 구절 기록 삭제
   */
  static async deleteQuote(quoteId: string): Promise<void> {
    try {
      await ApiClient.deleteDocument("quotes", quoteId)
    } catch (error) {
      console.error("QuoteService.deleteQuote error:", error)
      throw error
    }
  }

  /**
   * 공개된 구절 기록 조회 (탐색 페이지용)
   */
  static async getPublicQuotes(limitCount?: number): Promise<Quote[]> {
    try {
      return await ApiClient.queryDocuments<Quote>(
        "quotes",
        [["isPublic", "==", true]],
        "created_at",
        "desc",
        limitCount
      )
    } catch (error) {
      console.error("QuoteService.getPublicQuotes error:", error)
      return []
    }
  }
}

