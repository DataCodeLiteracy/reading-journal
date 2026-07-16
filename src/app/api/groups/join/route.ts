import { FieldValue } from "firebase-admin/firestore"
import { NextResponse } from "next/server"
import { getAdminFirestore } from "@/lib/firebaseAdmin"
import { verifyFirebaseIdToken } from "@/lib/verifyFirebaseIdToken"

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      idToken?: string
      inviteCode?: string
      displayName?: string
      memberKind?: string
    }
    const verified = await verifyFirebaseIdToken(body.idToken ?? "")
    if (!verified) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 })
    }

    const inviteCode = body.inviteCode?.trim().toUpperCase()
    const displayName = body.displayName?.trim()
    const memberKind =
      body.memberKind === "guardian" ? "guardian" : "participant"
    if (!inviteCode || !displayName) {
      return NextResponse.json(
        { error: "초대 코드와 표시 이름을 입력해주세요." },
        { status: 400 },
      )
    }

    const db = getAdminFirestore()
    const groupSnapshot = await db
      .collection("readingGroups")
      .where("invite_code", "==", inviteCode)
      .where("status", "==", "active")
      .limit(1)
      .get()
    const groupDocument = groupSnapshot.docs[0]
    if (!groupDocument) {
      return NextResponse.json(
        { error: "유효한 초대 코드를 찾을 수 없습니다." },
        { status: 404 },
      )
    }

    const memberRef = db
      .collection("readingGroupMembers")
      .doc(`${groupDocument.id}__${verified.uid}`)
    await db.runTransaction(async (transaction) => {
      const existing = await transaction.get(memberRef)
      const now = new Date().toISOString()
      transaction.set(
        memberRef,
        {
          group_id: groupDocument.id,
          user_id: verified.uid,
          display_name: displayName,
          role: "member",
          member_kind: memberKind,
          status: "active",
          joined_at: now,
          updated_at: FieldValue.serverTimestamp(),
          ...(existing.exists
            ? {}
            : { created_at: FieldValue.serverTimestamp() }),
        },
        { merge: true },
      )
    })

    return NextResponse.json({ ok: true, groupId: groupDocument.id })
  } catch (error) {
    console.error("reading group join:", error)
    return NextResponse.json({ error: "모임 가입에 실패했습니다." }, { status: 500 })
  }
}
