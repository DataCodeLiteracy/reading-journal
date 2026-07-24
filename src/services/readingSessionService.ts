import { ApiClient } from "@/lib/apiClient"
import { ReadingGroupService } from "@/services/readingGroupService"
import type { ReadingSession } from "@/types/user"
export class ReadingSessionService {
  private static warnAttributionSync(sessionId: string, error: unknown) {
    console.warn(
      `ReadingSessionService: 그룹 독서 귀속 동기화 실패 (재시도: syncGroupAttributionsForSession("${sessionId}"))`,
      error,
    )
  }

  private static warnFocusLevelSync(sessionId: string, error: unknown) {
    console.warn(
      `ReadingSessionService: focus-level 동기화 실패 (sessionId: "${sessionId}")`,
      error,
    )
  }

  /**
   * 기존 귀속을 지운 뒤 현재 세션 상태로 다시 계산합니다.
   * 보호자→자녀 이중 귀속을 위해 Admin API로 동기화합니다.
   */
  static async syncGroupAttributionsForSession(
    sessionId: string,
  ): Promise<void> {
    const { getClientIdToken } = await import("@/lib/getClientIdToken")
    const idToken = await getClientIdToken()
    const response = await fetch("/api/groups/sync-session-attributions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken, sessionId }),
    })
    const result = (await response.json()) as { error?: string }
    if (!response.ok) {
      throw new Error(result.error ?? "그룹 독서 귀속 동기화에 실패했습니다.")
    }
  }

  /**
   * focus-level 「독서」 활동에 세션을 upsert/delete 동기화합니다.
   * 실패해도 독서 세션 저장은 유지합니다 (best-effort).
   */
  static async syncFocusLevelSession(
    sessionId: string,
    op: "upsert" | "delete",
  ): Promise<void> {
    const { getClientIdToken } = await import("@/lib/getClientIdToken")
    const idToken = await getClientIdToken()
    const response = await fetch("/api/focus-level/sync-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken, sessionId, op }),
    })
    const result = (await response.json().catch(() => ({}))) as {
      error?: string
      skipped?: boolean
    }
    if (!response.ok) {
      throw new Error(result.error ?? "focus-level 동기화에 실패했습니다.")
    }
  }

  static async createReadingSession(
    sessionData: Omit<ReadingSession, "id" | "created_at" | "updated_at">
  ): Promise<string> {
    const sessionId = await ApiClient.createDocumentWithAutoId(
      "readingSessions",
      sessionData
    )
    try {
      const t = sessionData.endTime
        ? new Date(sessionData.endTime)
        : new Date()
      await ApiClient.updateDocument("books", sessionData.bookId, {
        last_read_at: t,
      } as Record<string, unknown>)
    } catch (e) {
      console.warn("ReadingSessionService: last_read_at 갱신 실패", e)
    }
    if (sessionData.source === "timer") {
      try {
        await this.syncGroupAttributionsForSession(sessionId)
      } catch (error) {
        this.warnAttributionSync(sessionId, error)
      }
    }
    try {
      await this.syncFocusLevelSession(sessionId, "upsert")
    } catch (error) {
      this.warnFocusLevelSync(sessionId, error)
    }
    return sessionId
  }

  /** 관리자 CSV보내기 등: 전체 독서 세션 (상한 있음) */
  static async getAllReadingSessionsForAdmin(
    limitCount: number = 10000
  ): Promise<ReadingSession[]> {
    return await ApiClient.queryDocuments<ReadingSession>(
      "readingSessions",
      [],
      undefined,
      "asc",
      limitCount
    )
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

  static async updateReadingSession(
    sessionId: string,
    sessionData: Partial<Omit<ReadingSession, "id" | "created_at" | "updated_at">>
  ): Promise<void> {
    try {
      await ApiClient.updateDocument("readingSessions", sessionId, sessionData)
      const full = await ApiClient.getDocument<ReadingSession>(
        "readingSessions",
        sessionId,
      )
      if (full?.bookId) {
        const end = full.endTime
        const t = end ? new Date(end) : new Date()
        try {
          await ApiClient.updateDocument("books", full.bookId, {
            last_read_at: t,
          } as Record<string, unknown>)
        } catch (e) {
          console.warn("ReadingSessionService: last_read_at 갱신 실패", e)
        }
      }
      if (full) {
        try {
          await this.syncGroupAttributionsForSession(sessionId)
        } catch (error) {
          this.warnAttributionSync(sessionId, error)
        }
        try {
          await this.syncFocusLevelSession(sessionId, "upsert")
        } catch (error) {
          this.warnFocusLevelSync(sessionId, error)
        }
      }
    } catch (error) {
      throw error
    }
  }

  static async deleteReadingSession(sessionId: string): Promise<void> {
    try {
      // 세션이 사라진 뒤에는 소유권을 증명할 수 없으므로 귀속을 먼저 삭제한다.
      const session = await ApiClient.getDocument<ReadingSession>(
        "readingSessions",
        sessionId,
      )
      if (session) {
        // focus-level 동기화는 세션 문서가 남아 있을 때 소유권 검증이 가능하므로 삭제 전에 호출
        try {
          await this.syncFocusLevelSession(sessionId, "delete")
        } catch (error) {
          this.warnFocusLevelSync(sessionId, error)
        }
        await ReadingGroupService.deleteReadingAttributionsBySession(
          sessionId,
          session.user_id,
        )
      }
      await ApiClient.deleteDocument("readingSessions", sessionId)
    } catch (error) {
      throw error
    }
  }
}
