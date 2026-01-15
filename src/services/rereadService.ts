import { ApiClient } from "@/lib/apiClient"
import { Reread } from "@/types/reread"

export class RereadService {
  /**
   * 회독 기록 생성
   */
  static async createReread(rereadData: Omit<Reread, "id" | "created_at" | "updated_at">): Promise<string> {
    try {
      // 소요 일수 계산
      const startDate = new Date(rereadData.startDate)
      const completedDate = new Date(rereadData.completedDate)
      const diffTime = completedDate.getTime() - startDate.getTime()
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1 // 시작일과 완료일 포함

      const dataWithDuration = {
        ...rereadData,
        durationDays: diffDays,
      }

      const rereadId = await ApiClient.createDocumentWithAutoId("rereads", dataWithDuration)
      return rereadId
    } catch (error) {
      console.error("RereadService.createReread error:", error)
      throw error
    }
  }

  /**
   * 책의 모든 회독 기록 조회
   */
  static async getBookRereads(bookId: string): Promise<Reread[]> {
    try {
      const rereads = await ApiClient.queryDocuments<Reread>("rereads", [
        ["bookId", "==", bookId],
      ])
      
      // 회독 번호 순으로 정렬 (1회독, 2회독, ...)
      return rereads.sort((a, b) => a.rereadNumber - b.rereadNumber)
    } catch (error) {
      console.error("RereadService.getBookRereads error:", error)
      throw error
    }
  }

  /**
   * 사용자의 모든 회독 기록 조회
   */
  static async getUserRereads(user_id: string): Promise<Reread[]> {
    try {
      const rereads = await ApiClient.queryDocuments<Reread>("rereads", [
        ["user_id", "==", user_id],
      ])
      
      // 책별, 회독 번호 순으로 정렬
      return rereads.sort((a, b) => {
        if (a.bookId !== b.bookId) {
          return a.bookId.localeCompare(b.bookId)
        }
        return a.rereadNumber - b.rereadNumber
      })
    } catch (error) {
      console.error("RereadService.getUserRereads error:", error)
      throw error
    }
  }

  /**
   * 회독 기록 삭제
   */
  static async deleteReread(rereadId: string): Promise<void> {
    try {
      await ApiClient.deleteDocument("rereads", rereadId)
    } catch (error) {
      console.error("RereadService.deleteReread error:", error)
      throw error
    }
  }
}

