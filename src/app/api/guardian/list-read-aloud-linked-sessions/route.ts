import { NextResponse } from "next/server"
import { getAdminFirestore } from "@/lib/firebaseAdmin"
import { verifyFirebaseIdToken } from "@/lib/verifyFirebaseIdToken"

export type ReadAloudDeleteTarget = {
  sessionId: string
  userId: string
  displayName: string
  role: "guardian" | "child"
  duration: number
  date: string
}

/**
 * 보호자 읽어주기 원본 세션과 복제된 자녀 세션 목록을 반환합니다.
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      idToken?: string
      parentSessionId?: string
    }
    const verified = await verifyFirebaseIdToken(body.idToken ?? "")
    if (!verified) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 })
    }
    const parentSessionId = body.parentSessionId?.trim()
    if (!parentSessionId) {
      return NextResponse.json(
        { error: "parentSessionId가 필요합니다." },
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
      date?: string
      startTime?: string
    }
    if (parent.user_id !== verified.uid) {
      return NextResponse.json({ error: "본인 세션만 조회할 수 있습니다." }, { status: 403 })
    }
    if (parent.reading_mode !== "read_aloud" || parent.read_aloud_parent_session_id) {
      return NextResponse.json(
        { error: "읽어주기 원본 세션만 대상입니다." },
        { status: 400 },
      )
    }

    const guardianUser = await db.collection("users").doc(verified.uid).get()
    const guardianName =
      (guardianUser.data() as { displayName?: string; name?: string } | undefined)
        ?.displayName ||
      (guardianUser.data() as { name?: string } | undefined)?.name ||
      "나(보호자)"

    const targets: ReadAloudDeleteTarget[] = [
      {
        sessionId: parentSessionId,
        userId: verified.uid,
        displayName: guardianName,
        role: "guardian",
        duration: Math.max(0, Math.round(parent.duration ?? 0)),
        date: parent.date || "",
      },
    ]

    const childSessions = await db
      .collection("readingSessions")
      .where("read_aloud_parent_session_id", "==", parentSessionId)
      .get()

    for (const doc of childSessions.docs) {
      const data = doc.data() as {
        user_id: string
        duration?: number
        date?: string
      }
      const linkDoc = await db
        .collection("guardianChildLinks")
        .doc(`${verified.uid}__${data.user_id}`)
        .get()
      const linkName = (
        linkDoc.data() as { child_display_name?: string } | undefined
      )?.child_display_name
      const childUser = await db.collection("users").doc(data.user_id).get()
      const childName =
        linkName ||
        (childUser.data() as { displayName?: string; name?: string } | undefined)
          ?.displayName ||
        (childUser.data() as { name?: string } | undefined)?.name ||
        "자녀"

      targets.push({
        sessionId: doc.id,
        userId: data.user_id,
        displayName: childName,
        role: "child",
        duration: Math.max(0, Math.round(data.duration ?? 0)),
        date: data.date || parent.date || "",
      })
    }

    return NextResponse.json({ ok: true, parentSessionId, targets })
  } catch (error) {
    console.error("list-read-aloud-linked-sessions:", error)
    return NextResponse.json(
      { error: "연계 세션을 불러오지 못했습니다." },
      { status: 500 },
    )
  }
}
