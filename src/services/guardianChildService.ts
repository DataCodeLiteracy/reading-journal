import { ApiClient, ApiError } from "@/lib/apiClient"
import { getClientIdToken } from "@/lib/getClientIdToken"
import type { GuardianChildLink, ReadAloudSegment } from "@/types/guardian"
import type { ReadingSession } from "@/types/user"

const COLLECTION = "guardianChildLinks"

function linkId(guardianUserId: string, childUserId: string) {
  return `${guardianUserId}__${childUserId}`
}

export class GuardianChildService {
  static async listChildren(guardianUserId: string): Promise<GuardianChildLink[]> {
    return ApiClient.queryDocuments<GuardianChildLink>(
      COLLECTION,
      [["guardian_user_id", "==", guardianUserId]],
      "created_at",
      "asc",
    )
  }

  static async ensureMyInviteCode(): Promise<string> {
    const idToken = await getClientIdToken()
    const response = await fetch("/api/guardian/ensure-invite-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    })
    const result = (await response.json()) as { code?: string; error?: string }
    if (!response.ok || !result.code) {
      throw new ApiError(
        result.error ?? "자녀 연결 코드를 발급하지 못했습니다.",
        "CHILD_INVITE_CODE_ERROR",
        response.status,
      )
    }
    return result.code
  }

  static async connectByInviteCode(code: string): Promise<GuardianChildLink> {
    const idToken = await getClientIdToken()
    const response = await fetch("/api/guardian/connect-child", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken, code: code.trim().toUpperCase() }),
    })
    const result = (await response.json()) as {
      link?: GuardianChildLink
      error?: string
    }
    if (!response.ok || !result.link) {
      throw new ApiError(
        result.error ?? "자녀를 연결하지 못했습니다.",
        "CHILD_CONNECT_ERROR",
        response.status,
      )
    }
    return result.link
  }

  static async disconnectChild(
    guardianUserId: string,
    childUserId: string,
  ): Promise<void> {
    await ApiClient.deleteDocument(
      COLLECTION,
      linkId(guardianUserId, childUserId),
    )
  }

  /**
   * 보호자 세션 저장 후 자녀에게 구간별 시간을 복제합니다.
   */
  static async replicateReadAloudSession(sessionId: string): Promise<void> {
    const idToken = await getClientIdToken()
    const response = await fetch("/api/guardian/replicate-read-aloud", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken, sessionId }),
    })
    const result = (await response.json()) as { error?: string }
    if (!response.ok) {
      throw new ApiError(
        result.error ?? "읽어주기 기록을 자녀에게 반영하지 못했습니다.",
        "READ_ALOUD_REPLICATE_ERROR",
        response.status,
      )
    }
  }

  /**
   * 선택한 자녀 서재에 책이 없는지 확인합니다. register=true면 없는 자녀에게 등록합니다.
   */
  static async ensureChildrenHaveBook(input: {
    canonicalBookId: string
    childUserIds: string[]
    register?: boolean
  }): Promise<{
    missing: Array<{ child_user_id: string; child_display_name: string }>
    registered: number
  }> {
    const idToken = await getClientIdToken()
    const response = await fetch("/api/guardian/ensure-children-books", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        idToken,
        canonicalBookId: input.canonicalBookId,
        childUserIds: input.childUserIds,
        register: Boolean(input.register),
      }),
    })
    const result = (await response.json()) as {
      missing?: Array<{ child_user_id: string; child_display_name: string }>
      registered?: number
      error?: string
    }
    if (!response.ok) {
      throw new ApiError(
        result.error ?? "자녀 서재 확인에 실패했습니다.",
        "ENSURE_CHILDREN_BOOKS_ERROR",
        response.status,
      )
    }
    return {
      missing: result.missing ?? [],
      registered: result.registered ?? 0,
    }
  }

  static async listReadAloudLinkedSessions(parentSessionId: string): Promise<
    Array<{
      sessionId: string
      userId: string
      displayName: string
      role: "guardian" | "child"
      duration: number
      date: string
    }>
  > {
    const idToken = await getClientIdToken()
    const response = await fetch(
      "/api/guardian/list-read-aloud-linked-sessions",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken, parentSessionId }),
      },
    )
    const result = (await response.json()) as {
      targets?: Array<{
        sessionId: string
        userId: string
        displayName: string
        role: "guardian" | "child"
        duration: number
        date: string
      }>
      error?: string
    }
    if (!response.ok) {
      throw new ApiError(
        result.error ?? "연계 세션을 불러오지 못했습니다.",
        "LIST_READ_ALOUD_LINKED_ERROR",
        response.status,
      )
    }
    return result.targets ?? []
  }

  static async deleteReadAloudSessions(input: {
    parentSessionId: string
    sessionIds: string[]
  }): Promise<number> {
    const idToken = await getClientIdToken()
    const response = await fetch("/api/guardian/delete-read-aloud-sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        idToken,
        parentSessionId: input.parentSessionId,
        sessionIds: input.sessionIds,
      }),
    })
    const result = (await response.json()) as {
      deleted?: number
      error?: string
    }
    if (!response.ok) {
      throw new ApiError(
        result.error ?? "읽어주기 기록 삭제에 실패했습니다.",
        "DELETE_READ_ALOUD_SESSIONS_ERROR",
        response.status,
      )
    }
    return result.deleted ?? 0
  }

  static childSecondsFromSegments(
    segments: ReadAloudSegment[],
    childUserId: string,
  ): number {
    return segments.reduce((total, segment) => {
      if (!segment.child_user_ids.includes(childUserId)) return total
      const start = new Date(segment.startTime).getTime()
      const end = new Date(segment.endTime).getTime()
      if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
        return total
      }
      return total + Math.floor((end - start) / 1000)
    }, 0)
  }

  static uniqueChildIds(segments: ReadAloudSegment[]): string[] {
    return [
      ...new Set(segments.flatMap((segment) => segment.child_user_ids)),
    ]
  }

  static isReadAloudSession(
    session: Pick<ReadingSession, "reading_mode">,
  ): boolean {
    return session.reading_mode === "read_aloud"
  }
}
