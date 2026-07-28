import { FieldValue } from "firebase-admin/firestore"
import { NextResponse } from "next/server"
import { getAdminFirestore } from "@/lib/firebaseAdmin"
import { verifyFirebaseIdToken } from "@/lib/verifyFirebaseIdToken"
import { ensureUserLibraryBookForCanonical } from "@/lib/groupLibrarySyncAdmin"
import { syncFocusLevelSessionForUserAdmin } from "@/lib/focusLevelSessionSyncAdmin"
import { getKoreaDateFromISO } from "@/utils/timeUtils"

type Segment = {
  child_user_ids: string[]
  startTime: string
  endTime: string
}

function childSeconds(segments: Segment[], childUserId: string): number {
  return segments.reduce((total, segment) => {
    if (!segment.child_user_ids?.includes(childUserId)) return total
    const start = new Date(segment.startTime).getTime()
    const end = new Date(segment.endTime).getTime()
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
      return total
    }
    return total + Math.floor((end - start) / 1000)
  }, 0)
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      idToken?: string
      sessionId?: string
    }
    const verified = await verifyFirebaseIdToken(body.idToken ?? "")
    if (!verified) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 })
    }
    const sessionId = body.sessionId?.trim()
    if (!sessionId) {
      return NextResponse.json({ error: "sessionId가 필요합니다." }, { status: 400 })
    }

    const db = getAdminFirestore()
    const sessionRef = db.collection("readingSessions").doc(sessionId)
    const sessionDoc = await sessionRef.get()
    if (!sessionDoc.exists) {
      return NextResponse.json({ error: "세션을 찾을 수 없습니다." }, { status: 404 })
    }
    const session = sessionDoc.data() as {
      user_id: string
      bookId: string
      source?: string
      reading_mode?: string
      read_aloud_segments?: Segment[]
      startTime: string
      endTime: string
      date?: string
    }
    if (session.user_id !== verified.uid) {
      return NextResponse.json({ error: "본인 세션만 처리할 수 있습니다." }, { status: 403 })
    }
    if (session.reading_mode !== "read_aloud") {
      return NextResponse.json({ ok: true, created: 0 })
    }
    const segments = Array.isArray(session.read_aloud_segments)
      ? session.read_aloud_segments
      : []
    if (segments.length === 0) {
      return NextResponse.json({ ok: true, created: 0 })
    }

    const links = await db
      .collection("guardianChildLinks")
      .where("guardian_user_id", "==", verified.uid)
      .get()
    const allowedChildren = new Set(
      links.docs.map((doc) => (doc.data() as { child_user_id: string }).child_user_id),
    )

    const bookDoc = await db.collection("books").doc(session.bookId).get()
    const book = bookDoc.data() as
      | {
          canonicalBookId?: string
          title?: string
        }
      | undefined
    const canonicalBookId = book?.canonicalBookId
    if (!canonicalBookId) {
      return NextResponse.json(
        { error: "공유 판본이 없는 책은 읽어주기를 자녀에게 복제할 수 없습니다." },
        { status: 400 },
      )
    }

    const childIds = [
      ...new Set(segments.flatMap((segment) => segment.child_user_ids || [])),
    ].filter((childId) => allowedChildren.has(childId))

    let created = 0
    for (const childUserId of childIds) {
      const duration = childSeconds(segments, childUserId)
      if (duration <= 0) continue

      await ensureUserLibraryBookForCanonical(db, childUserId, canonicalBookId)
      const childBooks = await db
        .collection("books")
        .where("user_id", "==", childUserId)
        .where("canonicalBookId", "==", canonicalBookId)
        .limit(1)
        .get()
      if (childBooks.empty) continue
      const childBookId = childBooks.docs[0].id

      const childStart = new Date(session.endTime)
      childStart.setSeconds(childStart.getSeconds() - duration)
      const startIso = childStart.toISOString()
      const endIso = session.endTime
      const date = session.date || getKoreaDateFromISO(startIso)

      // avoid duplicate replication
      const existing = await db
        .collection("readingSessions")
        .where("read_aloud_parent_session_id", "==", sessionId)
        .where("user_id", "==", childUserId)
        .limit(1)
        .get()
      if (!existing.empty) {
        try {
          await syncFocusLevelSessionForUserAdmin(
            db,
            childUserId,
            existing.docs[0].id,
          )
        } catch (syncError) {
          console.warn(
            "replicate-read-aloud focus-level re-sync:",
            childUserId,
            existing.docs[0].id,
            syncError,
          )
        }
        continue
      }

      const childSessionRef = await db.collection("readingSessions").add({
        user_id: childUserId,
        bookId: childBookId,
        source: "timer",
        reading_mode: "read_aloud",
        read_aloud_parent_session_id: sessionId,
        startTime: startIso,
        endTime: endIso,
        duration,
        date,
        created_at: FieldValue.serverTimestamp(),
        updated_at: FieldValue.serverTimestamp(),
      })

      await db.collection("books").doc(childBookId).set(
        {
          last_read_at: new Date(endIso),
          hasStartedReading: true,
          status: "reading",
          updated_at: FieldValue.serverTimestamp(),
        },
        { merge: true },
      )

      const statsRef = db.collection("userStatistics").doc(childUserId)
      const statsDoc = await statsRef.get()
      const prev = (statsDoc.data()?.totalReadingTime as number | undefined) ?? 0
      const sessions = (statsDoc.data()?.totalSessions as number | undefined) ?? 0
      await statsRef.set(
        {
          user_id: childUserId,
          totalReadingTime: prev + duration,
          totalSessions: sessions + 1,
          updated_at: FieldValue.serverTimestamp(),
        },
        { merge: true },
      )

      try {
        const syncResult = await syncFocusLevelSessionForUserAdmin(
          db,
          childUserId,
          childSessionRef.id,
        )
        if (!syncResult.ok) {
          console.warn(
            "replicate-read-aloud focus-level sync:",
            childUserId,
            childSessionRef.id,
            syncResult.reason,
          )
        }
      } catch (syncError) {
        console.warn(
          "replicate-read-aloud focus-level sync error:",
          childUserId,
          childSessionRef.id,
          syncError,
        )
      }

      created += 1
    }

    return NextResponse.json({ ok: true, created })
  } catch (error) {
    console.error("replicate-read-aloud:", error)
    return NextResponse.json(
      { error: "읽어주기 복제에 실패했습니다." },
      { status: 500 },
    )
  }
}
