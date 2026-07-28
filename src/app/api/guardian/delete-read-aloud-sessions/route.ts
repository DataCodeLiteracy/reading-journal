import { FieldValue } from "firebase-admin/firestore"
import { NextResponse } from "next/server"
import { getAdminFirestore } from "@/lib/firebaseAdmin"
import { deleteFocusLevelSessionForUserAdmin } from "@/lib/focusLevelSessionSyncAdmin"
import { verifyFirebaseIdToken } from "@/lib/verifyFirebaseIdToken"

/**
 * 보호자 읽어주기 원본과 연결된 세션 중 선택된 것만 삭제합니다.
 * focus-level 연동·모임 귀속·통계도 함께 정리합니다.
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      idToken?: string
      parentSessionId?: string
      sessionIds?: string[]
    }
    const verified = await verifyFirebaseIdToken(body.idToken ?? "")
    if (!verified) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 })
    }
    const parentSessionId = body.parentSessionId?.trim()
    const sessionIds = Array.isArray(body.sessionIds)
      ? [...new Set(body.sessionIds.map((id) => id.trim()).filter(Boolean))]
      : []
    if (!parentSessionId) {
      return NextResponse.json(
        { error: "parentSessionId가 필요합니다." },
        { status: 400 },
      )
    }
    if (sessionIds.length === 0) {
      return NextResponse.json(
        { error: "삭제할 기록을 한 개 이상 선택해주세요." },
        { status: 400 },
      )
    }

    const db = getAdminFirestore()
    const parentDoc = await db
      .collection("readingSessions")
      .doc(parentSessionId)
      .get()
    if (!parentDoc.exists) {
      return NextResponse.json({ error: "세션을 찾을 수 없습니다." }, { status: 404 })
    }
    const parent = parentDoc.data() as {
      user_id: string
      reading_mode?: string
      read_aloud_parent_session_id?: string
      duration?: number
    }
    if (parent.user_id !== verified.uid) {
      return NextResponse.json({ error: "본인 세션만 삭제할 수 있습니다." }, { status: 403 })
    }
    if (parent.reading_mode !== "read_aloud" || parent.read_aloud_parent_session_id) {
      return NextResponse.json(
        { error: "읽어주기 원본 세션만 대상입니다." },
        { status: 400 },
      )
    }

    const linkedChildren = await db
      .collection("readingSessions")
      .where("read_aloud_parent_session_id", "==", parentSessionId)
      .get()
    const allowed = new Map<string, { userId: string; duration: number }>()
    allowed.set(parentSessionId, {
      userId: verified.uid,
      duration: Math.max(0, Math.round(parent.duration ?? 0)),
    })
    for (const doc of linkedChildren.docs) {
      const data = doc.data() as { user_id: string; duration?: number }
      allowed.set(doc.id, {
        userId: data.user_id,
        duration: Math.max(0, Math.round(data.duration ?? 0)),
      })
    }

    for (const sessionId of sessionIds) {
      if (!allowed.has(sessionId)) {
        return NextResponse.json(
          { error: "선택한 기록 중 삭제할 수 없는 항목이 있습니다." },
          { status: 403 },
        )
      }
    }

    let deleted = 0
    for (const sessionId of sessionIds) {
      const meta = allowed.get(sessionId)!
      const sessionRef = db.collection("readingSessions").doc(sessionId)
      const sessionSnap = await sessionRef.get()
      if (!sessionSnap.exists) continue

      try {
        await deleteFocusLevelSessionForUserAdmin(db, meta.userId, sessionId)
      } catch (syncError) {
        console.warn(
          "delete-read-aloud-sessions focus-level:",
          sessionId,
          syncError,
        )
      }

      const attrs = await db
        .collection("readingGroupReadingAttributions")
        .where("reading_session_id", "==", sessionId)
        .get()
      if (!attrs.empty) {
        const batch = db.batch()
        attrs.docs.forEach((doc) => batch.delete(doc.ref))
        await batch.commit()
      }

      await sessionRef.delete()

      if (meta.duration > 0) {
        const statsRef = db.collection("userStatistics").doc(meta.userId)
        const statsDoc = await statsRef.get()
        const prev =
          (statsDoc.data()?.totalReadingTime as number | undefined) ?? 0
        const sessions =
          (statsDoc.data()?.totalSessions as number | undefined) ?? 0
        await statsRef.set(
          {
            user_id: meta.userId,
            totalReadingTime: Math.max(0, prev - meta.duration),
            totalSessions: Math.max(0, sessions - 1),
            updated_at: FieldValue.serverTimestamp(),
          },
          { merge: true },
        )
      }

      deleted += 1
    }

    return NextResponse.json({ ok: true, deleted })
  } catch (error) {
    console.error("delete-read-aloud-sessions:", error)
    return NextResponse.json(
      { error: "읽어주기 기록 삭제에 실패했습니다." },
      { status: 500 },
    )
  }
}
