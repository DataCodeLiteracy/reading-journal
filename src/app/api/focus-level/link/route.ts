import { NextResponse } from "next/server"
import { getAdminFirestore } from "@/lib/firebaseAdmin"
import {
  FOCUS_LEVEL_LINK_COLLECTION,
  type FocusLevelLink,
} from "@/lib/focusLevelLink"
import { verifyFirebaseIdToken } from "@/lib/verifyFirebaseIdToken"
import { verifyFocusLevelIdToken } from "@/lib/verifyFocusLevelIdToken"

/** 현재 앱 유저의 focus-level 연동 조회 */
export async function GET(request: Request) {
  try {
    const idToken = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "")
    const verified = await verifyFirebaseIdToken(idToken ?? "")
    if (!verified) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 })
    }
    const db = getAdminFirestore()
    const snap = await db
      .collection(FOCUS_LEVEL_LINK_COLLECTION)
      .doc(verified.uid)
      .get()
    if (!snap.exists) {
      return NextResponse.json({ link: null })
    }
    return NextResponse.json({ link: snap.data() as FocusLevelLink })
  } catch (error) {
    console.error("[focus-level/link GET]", error)
    return NextResponse.json({ error: "연동 정보를 불러오지 못했습니다." }, { status: 500 })
  }
}

/** focus-level 계정 + 활동 선택 저장 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      idToken?: string
      focusLevelIdToken?: string
      activityId?: string
      activityName?: string
    }
    const verified = await verifyFirebaseIdToken(body.idToken ?? "")
    if (!verified) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 })
    }
    const fl = await verifyFocusLevelIdToken(body.focusLevelIdToken ?? "")
    if (!fl) {
      return NextResponse.json(
        { error: "focus-level 로그인이 유효하지 않습니다." },
        { status: 401 },
      )
    }
    const activityId = body.activityId?.trim()
    const activityName = body.activityName?.trim()
    if (!activityId || !activityName) {
      return NextResponse.json(
        { error: "activityId와 activityName이 필요합니다." },
        { status: 400 },
      )
    }

    // 활동이 해당 FL 유저 소유인지 재확인
    const base =
      process.env.FOCUS_LEVEL_API_BASE_URL?.trim() ||
      process.env.NEXT_PUBLIC_FOCUS_LEVEL_API_BASE_URL?.trim() ||
      "https://focus-level.vercel.app"
    const actRes = await fetch(`${base.replace(/\/$/, "")}/api/external/activities`, {
      method: "GET",
      headers: { Authorization: `Bearer ${body.focusLevelIdToken}` },
    })
    const actJson = (await actRes.json().catch(() => ({}))) as {
      activities?: Array<{ id: string; name: string }>
      error?: string
    }
    if (!actRes.ok) {
      return NextResponse.json(
        { error: actJson.error ?? "활동 목록 확인에 실패했습니다." },
        { status: actRes.status >= 400 ? actRes.status : 502 },
      )
    }
    const found = (actJson.activities ?? []).find((a) => a.id === activityId)
    if (!found) {
      return NextResponse.json(
        { error: "선택한 활동을 focus-level에서 찾을 수 없습니다." },
        { status: 400 },
      )
    }

    const now = new Date().toISOString()
    const link: FocusLevelLink = {
      focusUserId: fl.uid,
      focusEmail: fl.email,
      activityId,
      activityName: found.name || activityName,
      linkedAt: now,
      updatedAt: now,
    }
    const db = getAdminFirestore()
    await db.collection(FOCUS_LEVEL_LINK_COLLECTION).doc(verified.uid).set(link, {
      merge: true,
    })
    return NextResponse.json({ ok: true, link })
  } catch (error) {
    console.error("[focus-level/link POST]", error)
    return NextResponse.json({ error: "연동 저장에 실패했습니다." }, { status: 500 })
  }
}

/** 연동 해제 */
export async function DELETE(request: Request) {
  try {
    const body = (await request.json()) as { idToken?: string }
    const verified = await verifyFirebaseIdToken(body.idToken ?? "")
    if (!verified) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 })
    }
    const db = getAdminFirestore()
    await db.collection(FOCUS_LEVEL_LINK_COLLECTION).doc(verified.uid).delete()
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("[focus-level/link DELETE]", error)
    return NextResponse.json({ error: "연동 해제에 실패했습니다." }, { status: 500 })
  }
}
