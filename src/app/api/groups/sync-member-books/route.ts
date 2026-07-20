import { NextResponse } from "next/server"
import { getAdminFirestore } from "@/lib/firebaseAdmin"
import { syncCanonicalToAllGroupMembers } from "@/lib/groupLibrarySyncAdmin"
import { verifyFirebaseIdToken } from "@/lib/verifyFirebaseIdToken"

/**
 * 모임 책(canonical)을 모든 활성 멤버(및 보호자 연계 자녀) 서재에 동기화합니다.
 * 호출자: 모임장
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      idToken?: string
      groupId?: string
      canonicalBookId?: string
    }
    const verified = await verifyFirebaseIdToken(body.idToken ?? "")
    if (!verified) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 })
    }
    const groupId = body.groupId?.trim()
    const canonicalBookId = body.canonicalBookId?.trim()
    if (!groupId || !canonicalBookId) {
      return NextResponse.json(
        { error: "groupId와 canonicalBookId가 필요합니다." },
        { status: 400 },
      )
    }

    const db = getAdminFirestore()
    const groupDoc = await db.collection("readingGroups").doc(groupId).get()
    if (!groupDoc.exists) {
      return NextResponse.json({ error: "모임을 찾을 수 없습니다." }, { status: 404 })
    }
    const ownerId = (groupDoc.data() as { owner_user_id?: string }).owner_user_id
    if (ownerId !== verified.uid) {
      return NextResponse.json({ error: "모임장만 동기화할 수 있습니다." }, { status: 403 })
    }

    const result = await syncCanonicalToAllGroupMembers(
      db,
      groupId,
      canonicalBookId,
    )
    return NextResponse.json({ ok: true, ...result })
  } catch (error) {
    console.error("sync-member-books:", error)
    return NextResponse.json(
      { error: "모임 책 서재 동기화에 실패했습니다." },
      { status: 500 },
    )
  }
}
