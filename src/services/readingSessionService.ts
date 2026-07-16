import { ApiClient } from "@/lib/apiClient"
import { ReadingGroupService } from "@/services/readingGroupService"
import type { Book } from "@/types/book"
import type {
  GroupMember,
  MeetingBookAssignment,
} from "@/types/readingGroup"
import type { ReadingSession } from "@/types/user"
import {
  calculateHalfOpenOverlapSeconds,
  effectiveAssignmentEndMs,
} from "@/utils/readingSessionAttribution"

export class ReadingSessionService {
  private static warnAttributionSync(sessionId: string, error: unknown) {
    console.warn(
      `ReadingSessionService: 그룹 독서 귀속 동기화 실패 (재시도: syncGroupAttributionsForSession("${sessionId}"))`,
      error,
    )
  }

  /**
   * 기존 귀속을 지운 뒤 현재 세션 상태로 다시 계산합니다.
   * 호출자가 실패를 감지해 재시도할 수 있도록 이 메서드 자체는 오류를 전달합니다.
   */
  static async syncGroupAttributionsForSession(
    sessionId: string,
  ): Promise<void> {
    const session = await ApiClient.getDocument<ReadingSession>(
      "readingSessions",
      sessionId,
    )
    if (!session) {
      throw new Error("귀속할 독서 세션을 찾을 수 없습니다.")
    }

    await ReadingGroupService.deleteReadingAttributionsBySession(
      sessionId,
      session.user_id,
    )
    if (session.source !== "timer") return

    const sessionStartMs = new Date(session.startTime).getTime()
    const sessionEndMs = new Date(session.endTime).getTime()
    if (
      !Number.isFinite(sessionStartMs) ||
      !Number.isFinite(sessionEndMs) ||
      sessionEndMs <= sessionStartMs
    ) {
      throw new Error("독서 세션의 시작/종료 시간이 올바르지 않습니다.")
    }

    // BookService가 이 서비스를 import하므로 순환 의존성을 피한다.
    const book = await ApiClient.getDocument<Book>("books", session.bookId)
    if (!book?.canonicalBookId) return

    const memberships = await ApiClient.queryDocuments<GroupMember>(
      "readingGroupMembers",
      [
        ["user_id", "==", session.user_id],
        ["status", "==", "active"],
      ],
    )

    const assignmentsByMembership = await Promise.all(
      memberships.map(async (membership) => ({
        membership,
        assignments: await ApiClient.queryDocuments<MeetingBookAssignment>(
          "readingGroupMeetingBookAssignments",
          [
            ["group_id", "==", membership.group_id],
            ["canonical_book_id", "==", book.canonicalBookId],
          ],
        ),
      })),
    )
    const attributedAt = new Date().toISOString()

    await Promise.all(
      assignmentsByMembership.flatMap(({ membership, assignments }) =>
        assignments.flatMap((assignment) => {
          const assignmentStartMs = new Date(assignment.reading_start_at).getTime()
          const assignmentEndMs = effectiveAssignmentEndMs(
            assignment.reading_end_at,
            assignment.stopped_at,
          )
          if (
            !Number.isFinite(assignmentStartMs) ||
            !Number.isFinite(assignmentEndMs) ||
            assignmentEndMs <= assignmentStartMs
          ) {
            return []
          }

          const countedSeconds = calculateHalfOpenOverlapSeconds(
            sessionStartMs,
            sessionEndMs,
            assignmentStartMs,
            assignmentEndMs,
          )
          if (countedSeconds <= 0) return []

          return [
            ReadingGroupService.createReadingAttribution(
              membership.group_id,
              {
                reading_session_id: sessionId,
                user_id: session.user_id,
                user_display_name: membership.display_name || "모임원",
                group_book_id: assignment.group_book_id,
                meeting_id: assignment.meeting_id,
                meeting_book_assignment_id: assignment.id,
                canonical_book_id: book.canonicalBookId!,
                session_start_at: session.startTime,
                session_end_at: session.endTime,
                counted_seconds: countedSeconds,
                attributed_at: attributedAt,
              },
            ),
          ]
        }),
      ),
    )
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
