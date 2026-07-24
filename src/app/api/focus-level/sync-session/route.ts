import { NextResponse } from "next/server"
import { getAdminFirestore } from "@/lib/firebaseAdmin"
import { verifyFirebaseIdToken } from "@/lib/verifyFirebaseIdToken"

type SyncBody = {
  idToken?: string
  op?: "upsert" | "delete"
  sessionId?: string
}

type BookMeta = {
  title: string
  author?: string
  publisher?: string
  status?: string
}

/**
 * 독서 세션을 focus-level 「독서」 활동에 동기화합니다.
 * 시크릿은 서버에만 두고, 클라이언트는 Firebase ID 토큰으로 본인만 호출합니다.
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
        "[focus-level/sync-session] FOCUS_LEVEL_INGEST_URL 또는 FOCUS_LEVEL_INGEST_SECRET 미설정 — 건너뜀",
      )
      return NextResponse.json({ ok: true, skipped: true })
    }

    const email = verified.email?.trim().toLowerCase()
    if (!email) {
      return NextResponse.json(
        { error: "계정 이메일을 확인할 수 없습니다. Google 로그인 계정이 필요합니다." },
        { status: 400 },
      )
    }

    const db = getAdminFirestore()
    const sessionDoc = await db.collection("readingSessions").doc(sessionId).get()

    if (op === "delete") {
      // 세션이 아직 있으면 소유권 확인. 이미 지워졌어도 focus-level 쪽 delete는 멱등.
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
          email,
          sourceApp: "reading-journal",
          sourceRecordId: sessionId,
        }),
      })
      const result = (await upstream.json().catch(() => ({}))) as {
        error?: string
        ok?: boolean
      }
      if (!upstream.ok) {
        console.error("[focus-level/sync-session] delete upstream:", result)
        return NextResponse.json(
          { error: result.error ?? "focus-level 동기화에 실패했습니다." },
          { status: upstream.status >= 400 ? upstream.status : 502 },
        )
      }
      return NextResponse.json({ ok: true, ...result })
    }

    // upsert
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

    let book: BookMeta = { title: "제목 없음" }
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

    const durationSeconds =
      session.duration != null && Number.isFinite(session.duration)
        ? Math.max(0, Math.round(session.duration))
        : undefined

    const upstream = await fetch(ingestUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-ingest-secret": ingestSecret,
      },
      body: JSON.stringify({
        op: "upsert",
        email,
        sourceApp: "reading-journal",
        sourceRecordId: sessionId,
        startTime: session.startTime,
        endTime: session.endTime,
        durationSeconds,
        book,
      }),
    })
    const result = (await upstream.json().catch(() => ({}))) as {
      error?: string
      ok?: boolean
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
