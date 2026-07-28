import type { Firestore } from "firebase-admin/firestore"
import {
  FOCUS_LEVEL_LINK_COLLECTION,
  FOCUS_LEVEL_MIN_SYNC_SECONDS,
  FOCUS_LEVEL_SOURCE_APP,
  type FocusLevelLink,
} from "@/lib/focusLevelLink"

const STATUS_LABELS: Record<string, string> = {
  reading: "읽는 중",
  completed: "완독",
  "want-to-read": "읽고 싶은 책",
  "on-hold": "보류",
}

function buildBookFeedbackLines(book: {
  title: string
  author?: string
  publisher?: string
  status?: string
}): string[] {
  const lines: string[] = []
  if (book.title) lines.push(`제목 : ${book.title}`)
  if (book.author) lines.push(`저자 : ${book.author}`)
  if (book.publisher) lines.push(`출판사 : ${book.publisher}`)
  if (book.status) {
    lines.push(`상태 : ${STATUS_LABELS[book.status] ?? book.status}`)
  }
  lines.push("출처 : 독서기록장")
  return lines
}

/**
 * Admin: 특정 독서기록장 유저의 세션을 focus-level에 upsert합니다.
 * 연동이 없거나 환경 변수가 없으면 skipped.
 */
export async function syncFocusLevelSessionForUserAdmin(
  db: Firestore,
  journalUserId: string,
  sessionId: string,
): Promise<{ ok: boolean; skipped?: boolean; reason?: string }> {
  const ingestUrl = process.env.FOCUS_LEVEL_INGEST_URL?.trim()
  const ingestSecret = process.env.FOCUS_LEVEL_INGEST_SECRET?.trim()
  if (!ingestUrl || !ingestSecret) {
    return { ok: true, skipped: true, reason: "env" }
  }

  const linkSnap = await db
    .collection(FOCUS_LEVEL_LINK_COLLECTION)
    .doc(journalUserId)
    .get()
  if (!linkSnap.exists) {
    return { ok: true, skipped: true, reason: "not_linked" }
  }
  const link = linkSnap.data() as FocusLevelLink
  if (!link.focusUserId || !link.activityId) {
    return { ok: true, skipped: true, reason: "incomplete_link" }
  }

  const sessionDoc = await db.collection("readingSessions").doc(sessionId).get()
  if (!sessionDoc.exists) {
    return { ok: false, reason: "session_missing" }
  }
  const session = sessionDoc.data() as {
    user_id: string
    bookId: string
    startTime: string
    endTime: string
    duration: number
  }
  if (session.user_id !== journalUserId) {
    return { ok: false, reason: "user_mismatch" }
  }

  const durationSeconds =
    session.duration != null && Number.isFinite(session.duration)
      ? Math.max(0, Math.round(session.duration))
      : 0
  if (durationSeconds < FOCUS_LEVEL_MIN_SYNC_SECONDS) {
    return {
      ok: true,
      skipped: true,
      reason: "too_short",
    }
  }

  let book = {
    title: "제목 없음",
    author: undefined as string | undefined,
    publisher: undefined as string | undefined,
    status: undefined as string | undefined,
  }
  if (session.bookId) {
    const bookDoc = await db.collection("books").doc(session.bookId).get()
    if (bookDoc.exists) {
      const b = bookDoc.data() as {
        title?: string
        author?: string
        publisher?: string
        status?: string
      }
      book = {
        title: (b.title ?? "").trim() || "제목 없음",
        author: b.author?.trim() || undefined,
        publisher: b.publisher?.trim() || undefined,
        status: b.status?.trim() || undefined,
      }
    }
  }

  const upstream = await fetch(ingestUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-ingest-secret": ingestSecret,
    },
    body: JSON.stringify({
      op: "upsert",
      userId: link.focusUserId,
      activityId: link.activityId,
      sourceApp: FOCUS_LEVEL_SOURCE_APP,
      sourceRecordId: sessionId,
      startTime: session.startTime,
      endTime: session.endTime,
      durationSeconds,
      feedbackLines: buildBookFeedbackLines(book),
    }),
  })
  if (!upstream.ok) {
    const result = (await upstream.json().catch(() => ({}))) as {
      error?: string
    }
    console.error(
      "[focus-level admin sync] upsert failed",
      sessionId,
      journalUserId,
      result,
    )
    return { ok: false, reason: result.error ?? "upstream_error" }
  }
  return { ok: true }
}
