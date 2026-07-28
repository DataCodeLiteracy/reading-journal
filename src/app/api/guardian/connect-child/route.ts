import { FieldValue } from "firebase-admin/firestore"
import { NextResponse } from "next/server"
import { getAdminFirestore } from "@/lib/firebaseAdmin"
import { verifyFirebaseIdToken } from "@/lib/verifyFirebaseIdToken"
import { canLinkChildren, GUARDIAN_MIN_KOREAN_AGE } from "@/utils/koreanAge"

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { idToken?: string; code?: string }
    const verified = await verifyFirebaseIdToken(body.idToken ?? "")
    if (!verified) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 })
    }
    const code = body.code?.trim().toUpperCase()
    if (!code || code.length < 6) {
      return NextResponse.json({ error: "연결 코드를 확인해 주세요." }, { status: 400 })
    }

    const db = getAdminFirestore()
    const guardianDoc = await db.collection("users").doc(verified.uid).get()
    const guardianBirthYear = (
      guardianDoc.data() as { birthYear?: number | null } | undefined
    )?.birthYear
    if (!canLinkChildren(guardianBirthYear)) {
      return NextResponse.json(
        {
          error: `자녀 연결은 프로필에 출생 연도를 등록하고 한국 나이 ${GUARDIAN_MIN_KOREAN_AGE}세 이상인 경우만 가능합니다.`,
        },
        { status: 403 },
      )
    }

    const childSnap = await db
      .collection("users")
      .where("child_invite_code", "==", code)
      .limit(1)
      .get()
    if (childSnap.empty) {
      return NextResponse.json(
        { error: "해당 코드의 자녀 계정을 찾을 수 없습니다." },
        { status: 404 },
      )
    }
    const childDoc = childSnap.docs[0]
    const childUserId = childDoc.id
    if (childUserId === verified.uid) {
      return NextResponse.json(
        { error: "본인 계정은 자녀로 연결할 수 없습니다." },
        { status: 400 },
      )
    }

    const linkId = `${verified.uid}__${childUserId}`
    const linkRef = db.collection("guardianChildLinks").doc(linkId)
    const existing = await linkRef.get()
    if (existing.exists) {
      return NextResponse.json({
        link: { id: linkId, ...existing.data() },
      })
    }

    const childData = childDoc.data() as { displayName?: string | null }
    const childDisplayName =
      (typeof childData.displayName === "string" && childData.displayName.trim()) ||
      "자녀"

    const link = {
      guardian_user_id: verified.uid,
      child_user_id: childUserId,
      child_display_name: childDisplayName,
      created_at: FieldValue.serverTimestamp(),
      updated_at: FieldValue.serverTimestamp(),
    }
    await linkRef.set(link)

    return NextResponse.json({
      link: {
        id: linkId,
        guardian_user_id: verified.uid,
        child_user_id: childUserId,
        child_display_name: childDisplayName,
      },
    })
  } catch (error) {
    console.error("connect-child:", error)
    return NextResponse.json(
      { error: "자녀를 연결하지 못했습니다." },
      { status: 500 },
    )
  }
}
