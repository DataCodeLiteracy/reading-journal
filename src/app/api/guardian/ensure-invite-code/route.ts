import { FieldValue } from "firebase-admin/firestore"
import { NextResponse } from "next/server"
import { getAdminFirestore } from "@/lib/firebaseAdmin"
import { verifyFirebaseIdToken } from "@/lib/verifyFirebaseIdToken"

function generateInviteCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  let code = ""
  for (let i = 0; i < 8; i += 1) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)]
  }
  return code
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { idToken?: string }
    const verified = await verifyFirebaseIdToken(body.idToken ?? "")
    if (!verified) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 })
    }

    const db = getAdminFirestore()
    const userRef = db.collection("users").doc(verified.uid)
    const userDoc = await userRef.get()
    if (!userDoc.exists) {
      return NextResponse.json({ error: "유저를 찾을 수 없습니다." }, { status: 404 })
    }
    const existing = userDoc.data()?.child_invite_code
    if (typeof existing === "string" && existing.trim()) {
      return NextResponse.json({ code: existing.trim().toUpperCase() })
    }

    for (let attempt = 0; attempt < 8; attempt += 1) {
      const code = generateInviteCode()
      const clash = await db
        .collection("users")
        .where("child_invite_code", "==", code)
        .limit(1)
        .get()
      if (!clash.empty) continue
      await userRef.set(
        {
          child_invite_code: code,
          updated_at: FieldValue.serverTimestamp(),
        },
        { merge: true },
      )
      return NextResponse.json({ code })
    }

    return NextResponse.json(
      { error: "연결 코드 발급에 실패했습니다. 다시 시도해 주세요." },
      { status: 500 },
    )
  } catch (error) {
    console.error("ensure-invite-code:", error)
    return NextResponse.json(
      { error: "연결 코드를 발급하지 못했습니다." },
      { status: 500 },
    )
  }
}
