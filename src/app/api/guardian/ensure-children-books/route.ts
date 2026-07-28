import { NextResponse } from "next/server"
import { getAdminFirestore } from "@/lib/firebaseAdmin"
import { ensureUserLibraryBookForCanonical } from "@/lib/groupLibrarySyncAdmin"
import { verifyFirebaseIdToken } from "@/lib/verifyFirebaseIdToken"
import { canLinkChildren } from "@/utils/koreanAge"

type MissingChild = {
  child_user_id: string
  child_display_name: string
}

/**
 * 읽어주기 전에 선택한 자녀 서재에 책이 있는지 확인하고,
 * register=true면 없는 자녀에게 canonical 책을 등록합니다.
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      idToken?: string
      canonicalBookId?: string
      childUserIds?: string[]
      register?: boolean
    }
    const verified = await verifyFirebaseIdToken(body.idToken ?? "")
    if (!verified) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 })
    }

    const canonicalBookId = body.canonicalBookId?.trim()
    const childUserIds = Array.isArray(body.childUserIds)
      ? [...new Set(body.childUserIds.map((id) => id?.trim()).filter(Boolean))]
      : []
    const shouldRegister = Boolean(body.register)

    if (!canonicalBookId) {
      return NextResponse.json(
        { error: "공유 판본이 없는 책은 자녀 서재에 등록할 수 없습니다." },
        { status: 400 },
      )
    }
    if (childUserIds.length === 0) {
      return NextResponse.json(
        { error: "자녀를 한 명 이상 선택해주세요." },
        { status: 400 },
      )
    }

    const db = getAdminFirestore()
    const guardianDoc = await db.collection("users").doc(verified.uid).get()
    const birthYear = (
      guardianDoc.data() as { birthYear?: number | null } | undefined
    )?.birthYear
    if (!canLinkChildren(birthYear)) {
      return NextResponse.json(
        { error: "자녀 연결 권한이 없습니다." },
        { status: 403 },
      )
    }

    const links = await db
      .collection("guardianChildLinks")
      .where("guardian_user_id", "==", verified.uid)
      .get()
    const linkByChild = new Map(
      links.docs.map((doc) => {
        const data = doc.data() as {
          child_user_id: string
          child_display_name?: string
        }
        return [data.child_user_id, data.child_display_name || "자녀"] as const
      }),
    )

    for (const childId of childUserIds) {
      if (!linkByChild.has(childId)) {
        return NextResponse.json(
          { error: "연결되지 않은 자녀가 포함되어 있습니다." },
          { status: 403 },
        )
      }
    }

    const canonicalDoc = await db
      .collection("canonicalBooks")
      .doc(canonicalBookId)
      .get()
    if (!canonicalDoc.exists) {
      return NextResponse.json(
        { error: "공유 판본을 찾을 수 없습니다." },
        { status: 404 },
      )
    }

    const missing: MissingChild[] = []
    for (const childId of childUserIds) {
      const existing = await db
        .collection("books")
        .where("user_id", "==", childId)
        .where("canonicalBookId", "==", canonicalBookId)
        .limit(1)
        .get()
      if (existing.empty) {
        missing.push({
          child_user_id: childId,
          child_display_name: linkByChild.get(childId) || "자녀",
        })
      }
    }

    if (!shouldRegister || missing.length === 0) {
      return NextResponse.json({
        ok: true,
        missing,
        registered: 0,
      })
    }

    let registered = 0
    for (const child of missing) {
      const result = await ensureUserLibraryBookForCanonical(
        db,
        child.child_user_id,
        canonicalBookId,
      )
      if (result === "created" || result === "exists") {
        registered += 1
      }
    }

    return NextResponse.json({
      ok: true,
      missing: [],
      registered,
      previouslyMissing: missing,
    })
  } catch (error) {
    console.error("ensure-children-books:", error)
    return NextResponse.json(
      { error: "자녀 서재 확인에 실패했습니다." },
      { status: 500 },
    )
  }
}
