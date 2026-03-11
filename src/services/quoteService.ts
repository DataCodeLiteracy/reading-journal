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
   * 구절 기록 일괄 생성 (JSON 업로드용, 관리자)
   */
  static async createQuotes(
    bookId: string,
    user_id: string,
    items: Array<{
      quoteText: string
      thoughts?: string
      generalThoughts?: string
      page?: number
      isPublic?: boolean
    }>
  ): Promise<{ success: number; failed: number; errors: string[] }> {
    const errors: string[] = []
    let success = 0
    let failed = 0
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      if (!item.quoteText?.trim()) {
        failed++
        errors.push(`항목 ${i + 1}: 구절 텍스트가 비어 있습니다.`)
        continue
      }
      try {
        await this.createQuote({
          bookId,
          user_id,
          quoteText: item.quoteText.trim(),
          thoughts: item.thoughts?.trim() || undefined,
          generalThoughts: item.generalThoughts?.trim() || undefined,
          page: item.page,
          isPublic: item.isPublic ?? false,
        })
        success++
      } catch (e) {
        failed++
        errors.push(`항목 ${i + 1}: ${e instanceof Error ? e.message : "저장 실패"}`)
      }
    }
    return { success, failed, errors }
  }
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

