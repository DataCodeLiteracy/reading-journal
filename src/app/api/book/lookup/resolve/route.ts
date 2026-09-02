import { NextResponse } from "next/server"
import { resolveBookMetadata } from "@/lib/bookLookupSearch"
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

    const metadata = await resolveBookMetadata(body.hit)
    return NextResponse.json({ metadata })
  } catch (e) {
    console.error("book lookup resolve:", e)
    const message =
      e instanceof Error ? e.message : "도서 정보 조회 중 오류가 발생했습니다."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
