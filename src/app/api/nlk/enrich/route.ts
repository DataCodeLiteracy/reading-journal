import { NextResponse } from "next/server"
import { enrichBookLookupFromNlk } from "@/lib/nlkOpenApi"
import { verifyFirebaseIdToken } from "@/lib/verifyFirebaseIdToken"
import type { BookLookupMetadata } from "@/types/bookLookup"

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      idToken?: string
      hit?: BookLookupMetadata
    }

    if (!body.idToken || !(await verifyFirebaseIdToken(body.idToken))) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 })
    }

    if (!body.hit?.title?.trim()) {
      return NextResponse.json({ error: "도서 정보가 필요합니다." }, { status: 400 })
    }

    const enrichment = await enrichBookLookupFromNlk(body.hit)
    return NextResponse.json({ enrichment })
  } catch (e) {
    console.error("nlk enrich:", e)
    const message =
      e instanceof Error
        ? e.message
        : "국립중앙도서관 조회 중 오류가 발생했습니다."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
