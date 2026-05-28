import { NextResponse } from "next/server"
import { verifyFirebaseIdToken } from "@/lib/verifyFirebaseIdToken"
import { getAdminFirestore } from "@/lib/firebaseAdmin"

export async function getIdTokenFromRequest(
  req: Request,
  body?: { idToken?: string }
): Promise<string | null> {
  const auth = req.headers.get("authorization")
  if (auth?.startsWith("Bearer ")) {
    return auth.slice(7).trim() || null
  }
  return body?.idToken?.trim() || null
}

/** 관리자 API: ID 토큰 검증 + Firestore users.isAdmin */
export async function verifyAdminRequest(
  req: Request,
  body?: { idToken?: string }
): Promise<{ uid: string } | NextResponse> {
  const idToken = await getIdTokenFromRequest(req, body)
  if (!idToken) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 })
  }

  const verified = await verifyFirebaseIdToken(idToken)
  if (!verified) {
    return NextResponse.json({ error: "유효하지 않은 토큰입니다." }, { status: 401 })
  }

  try {
    const snap = await getAdminFirestore()
      .collection("users")
      .doc(verified.uid)
      .get()
    if (!snap.exists || !snap.data()?.isAdmin) {
      return NextResponse.json({ error: "관리자 권한이 없습니다." }, { status: 403 })
    }
    return { uid: verified.uid }
  } catch (e) {
    console.error("verifyAdminRequest:", e)
    return NextResponse.json(
      { error: "관리자 확인 중 오류가 발생했습니다." },
      { status: 500 }
    )
  }
}
