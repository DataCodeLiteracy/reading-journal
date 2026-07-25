import { NextResponse } from "next/server"
import { getAdminFirestore } from "@/lib/firebaseAdmin"
import {
  FOCUS_LEVEL_LINK_COLLECTION,
  FOCUS_LEVEL_MIN_SYNC_SECONDS,
  FOCUS_LEVEL_SOURCE_APP,
  type FocusLevelLink,
} from "@/lib/focusLevelLink"
import { verifyFirebaseIdToken } from "@/lib/verifyFirebaseIdToken"

type SyncBody = {
  idToken?: string
  op?: "upsert" | "delete"
  sessionId?: string
}

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
 * 독서 세션 → focus-level 연동 활동으로 sync
 * 연동(focusLevelLink)이 없으면 skipped
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SyncBody
    const verified = await verifyFirebaseIdToken(body.idToken ?? "")
    if (!verified) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 })
    }

    const op = body.op
    const sessionId = body.sessionId?.trim()
    if (op !== "upsert" && op !== "delete") {
      return NextResponse.json(
        { error: "op은 upsert 또는 delete 여야 합니다." },
        { status: 400 },
      )
    }
    if (!sessionId) {
      return NextResponse.json({ error: "sessionId가 필요합니다." }, { status: 400 })
    }

    const ingestUrl = process.env.FOCUS_LEVEL_INGEST_URL?.trim()
    const ingestSecret = process.env.FOCUS_LEVEL_INGEST_SECRET?.trim()
    if (!ingestUrl || !ingestSecret) {
      console.warn(
        "[focus-level/sync-session] FOCUS_LEVEL_INGEST_URL 또는 SECRET 미설정 — 건너뜀",
      )
      return NextResponse.json({ ok: true, skipped: true, reason: "env" })
    }

    const db = getAdminFirestore()
    const linkSnap = await db
      .collection(FOCUS_LEVEL_LINK_COLLECTION)
      .doc(verified.uid)
      .get()
    if (!linkSnap.exists) {
      return NextResponse.json({
        ok: true,
        skipped: true,
        reason: "not_linked",
      })
    }
    const link = linkSnap.data() as FocusLevelLink
    if (!link.focusUserId || !link.activityId) {
      return NextResponse.json({
        ok: true,
        skipped: true,
        reason: "incomplete_link",
      })
    }

    const sessionDoc = await db.collection("readingSessions").doc(sessionId).get()

    if (op === "delete") {
      if (sessionDoc.exists) {
        const session = sessionDoc.data() as { user_id?: string }
        if (session.user_id !== verified.uid) {
          return NextResponse.json(
            { error: "본인 세션만 동기화할 수 있습니다." },
            { status: 403 },
          )
        }
      }
      const upstream = await fetch(ingestUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-ingest-secret": ingestSecret,
        },
        body: JSON.stringify({
          op: "delete",
          userId: link.focusUserId,
          activityId: link.activityId,
          sourceApp: FOCUS_LEVEL_SOURCE_APP,
          sourceRecordId: sessionId,
        }),
      })
      const result = (await upstream.json().catch(() => ({}))) as {
        error?: string
      }
      if (!upstream.ok) {
        return NextResponse.json(
          { error: result.error ?? "focus-level 동기화에 실패했습니다." },
          { status: upstream.status >= 400 ? upstream.status : 502 },
        )
      }
      return NextResponse.json({ ok: true, ...result })
    }

    if (!sessionDoc.exists) {
      return NextResponse.json({ error: "세션을 찾을 수 없습니다." }, { status: 404 })
    }
    const session = sessionDoc.data() as {
      user_id: string
      bookId: string
      startTime: string
      endTime: string
      duration: number
    }
    if (session.user_id !== verified.uid) {
      return NextResponse.json(
        { error: "본인 세션만 동기화할 수 있습니다." },
        { status: 403 },
      )
    }

    const durationSeconds =
      session.duration != null && Number.isFinite(session.duration)
        ? Math.max(0, Math.round(session.duration))
        : 0
    if (durationSeconds < FOCUS_LEVEL_MIN_SYNC_SECONDS) {
      return NextResponse.json({
        ok: true,
        skipped: true,
        reason: "too_short",
        durationSeconds,
      })
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
    const result = (await upstream.json().catch(() => ({}))) as {
      error?: string
    }
    if (!upstream.ok) {
      console.error("[focus-level/sync-session] upsert upstream:", result)
      return NextResponse.json(
        { error: result.error ?? "focus-level 동기화에 실패했습니다." },
        { status: upstream.status >= 400 ? upstream.status : 502 },
      )
    }
    return NextResponse.json({ ok: true, ...result })
  } catch (error) {
    console.error("[focus-level/sync-session]", error)
    return NextResponse.json(
      { error: "focus-level 동기화에 실패했습니다." },
      { status: 500 },
    )
  }
}
