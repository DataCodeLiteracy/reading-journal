import { NextResponse } from "next/server"
import { getAdminFirestore } from "@/lib/firebaseAdmin"
import { verifyAdminRequest } from "@/lib/verifyAdminRequest"
import {
  backfillCanonicalBooksAdmin,
  backfillGoldenBellQuizzesAdmin,
  backfillReadingContentPacksAdmin,
  runCanonicalBackfillAll,
  scanCanonicalBackfill,
} from "@/lib/adminCanonicalBackfill"

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { idToken?: string; action?: string }
    const admin = await verifyAdminRequest(req, body)
    if (admin instanceof NextResponse) return admin

    const action = body.action ?? "scan"
    const db = getAdminFirestore()

    switch (action) {
      case "scan": {
        const scan = await scanCanonicalBackfill(db)
        return NextResponse.json({ ok: true, scan })
      }
      case "backfillCanonical": {
        const canonical = await backfillCanonicalBooksAdmin(db)
        return NextResponse.json({ ok: true, canonical })
      }
      case "backfillPacks": {
        const packs = await backfillReadingContentPacksAdmin(db)
        return NextResponse.json({ ok: true, packs })
      }
      case "backfillGoldenBell": {
        const goldenBell = await backfillGoldenBellQuizzesAdmin(db)
        return NextResponse.json({ ok: true, goldenBell })
      }
      case "runAll": {
        const result = await runCanonicalBackfillAll(db)
        return NextResponse.json({ ok: true, ...result })
      }
      default:
        return NextResponse.json({ error: "알 수 없는 action입니다." }, { status: 400 })
    }
  } catch (e) {
    console.error("canonical-backfill POST:", e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "서버 오류" },
      { status: 500 },
    )
  }
}
