import { NextResponse } from "next/server"
import { FieldValue } from "firebase-admin/firestore"
import { getAdminFirestore } from "@/lib/firebaseAdmin"
import { verifyFirebaseIdToken } from "@/lib/verifyFirebaseIdToken"
import { verifyAdminRequest, getIdTokenFromRequest } from "@/lib/verifyAdminRequest"
import type { AladinCategoryApplyLogEntry } from "@/types/aladinCategoryApplyLog"

const COLLECTION = "aladinCategoryApplyLogs"
const MAX_LIMIT = 200

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      idToken?: string
      entry?: Omit<AladinCategoryApplyLogEntry, "userId" | "createdAt">
    }

    const idToken = await getIdTokenFromRequest(req, body)
    if (!idToken) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 })
    }

    const verified = await verifyFirebaseIdToken(idToken)
    if (!verified) {
      return NextResponse.json({ error: "유효하지 않은 토큰입니다." }, { status: 401 })
    }

    const entry = body.entry
    if (!entry?.source) {
      return NextResponse.json({ error: "entry가 필요합니다." }, { status: 400 })
    }

    const { userId: _ignored, ...rest } = entry as AladinCategoryApplyLogEntry

    const doc = {
      ...rest,
      userId: verified.uid,
      createdAt: FieldValue.serverTimestamp(),
    }

    await getAdminFirestore().collection(COLLECTION).add(doc)

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error("aladin category-apply-log POST:", e)
    return NextResponse.json(
      { error: "로그 저장 중 오류가 발생했습니다." },
      { status: 500 },
    )
  }
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const idToken =
      url.searchParams.get("idToken")?.trim() ||
      (await getIdTokenFromRequest(req)) ||
      ""

    const admin = await verifyAdminRequest(req, { idToken })
    if (admin instanceof NextResponse) return admin

    const limitRaw = Number(url.searchParams.get("limit") ?? "100")
    const limit = Math.min(
      Math.max(Number.isFinite(limitRaw) ? limitRaw : 100, 1),
      MAX_LIMIT,
    )

    const snap = await getAdminFirestore()
      .collection(COLLECTION)
      .orderBy("createdAt", "desc")
      .limit(limit)
      .get()

    const logs: AladinCategoryApplyLogEntry[] = snap.docs.map((doc) => {
      const d = doc.data()
      const createdAt = d.createdAt
      return {
        ...(d as AladinCategoryApplyLogEntry),
        createdAt:
          createdAt && typeof createdAt.toDate === "function"
            ? createdAt.toDate().toISOString()
            : typeof createdAt === "string"
              ? createdAt
              : undefined,
      }
    })

    return NextResponse.json({ logs })
  } catch (e) {
    console.error("aladin category-apply-log GET:", e)
    return NextResponse.json(
      { error: "로그 조회 중 오류가 발생했습니다." },
      { status: 500 },
    )
  }
}
