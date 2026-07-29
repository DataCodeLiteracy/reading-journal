import { NextResponse } from "next/server"
import { getAdminFirestore } from "@/lib/firebaseAdmin"
import { verifyAdminRequest } from "@/lib/verifyAdminRequest"
import { backfillBooksPublicAdmin } from "@/lib/adminBooksPublicBackfill"

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      idToken?: string
      dryRun?: boolean
    }
    const admin = await verifyAdminRequest(req, body)
    if (admin instanceof NextResponse) return admin

    const db = getAdminFirestore()
    if (body.dryRun) {
      const snap = await db.collection("books").get()
      let alreadyPublic = 0
      let leftPrivate = 0
      let needsUpdate = 0
      for (const doc of snap.docs) {
        const flag = doc.data().isBookPublic
        if (flag === true) alreadyPublic += 1
        else if (flag === false) leftPrivate += 1
        else needsUpdate += 1
      }
      return NextResponse.json({
        ok: true,
        dryRun: true,
        total: snap.size,
        alreadyPublic,
        leftPrivate,
        needsUpdate,
      })
    }

    const result = await backfillBooksPublicAdmin(db)
    return NextResponse.json({ ok: true, ...result })
  } catch (e) {
    console.error("books-public-backfill POST:", e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "서버 오류" },
      { status: 500 },
    )
  }
}
