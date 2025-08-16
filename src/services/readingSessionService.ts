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
      console.log(`🔍 독서 기록 조회 시작 - bookId: ${bookId}`)
      
      // Firebase 인덱스 생성 완료 후 서버 사이드 정렬 사용
      const result = await ApiClient.queryDocuments<ReadingSession>(
        "readingSessions",
        [["bookId", "==", bookId]],
        "date",
        "desc"
      )
      
      console.log(`📊 Firestore에서 조회된 독서 기록 수: ${result.length}`)
      
      if (result.length > 0) {
        console.log(`📅 첫 번째 기록 (최신):`, {
          id: result[0].id,
          date: result[0].date,
          startTime: result[0].startTime,
          endTime: result[0].endTime,
          duration: result[0].duration
        })
        
        if (result.length > 1) {
          console.log(`📅 마지막 기록 (오래된):`, {
            id: result[result.length - 1].id,
            date: result[result.length - 1].date,
            startTime: result[result.length - 1].startTime,
            endTime: result[result.length - 1].endTime,
            duration: result[result.length - 1].duration
          })
        }
      }
      
      console.log(`✅ 서버 사이드 정렬 완료 - 총 ${result.length}개 기록`)
      if (result.length > 0) {
        console.log(`🥇 정렬 후 첫 번째 (최신): ${result[0].date}`)
        console.log(`🥉 정렬 후 마지막 (오래된): ${result[result.length - 1].date}`)
      }
      
      return result
    } catch (error: any) {
      console.error(`❌ 독서 기록 조회 오류:`, error)
      
      // 인덱스 오류인 경우 클라이언트 사이드 정렬으로 fallback
      if (error.message?.includes('인덱스') || error.code === 'failed-precondition') {
        console.log(`⚠️ 인덱스 오류로 클라이언트 사이드 정렬 사용`)
        
        const fallbackResult = await ApiClient.queryDocuments<ReadingSession>(
          "readingSessions",
          [["bookId", "==", bookId]]
        )
        
        const sortedResult = fallbackResult.sort((a, b) => {
          const dateA = new Date(a.date).getTime()
          const dateB = new Date(b.date).getTime()
          return dateB - dateA // 내림차순 (최신이 위로)
        })
        
        console.log(`✅ 클라이언트 사이드 정렬 완료`)
        return sortedResult
      }
      
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
