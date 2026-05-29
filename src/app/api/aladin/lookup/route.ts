import { NextResponse } from "next/server"
import { verifyFirebaseIdToken } from "@/lib/verifyFirebaseIdToken"
import {
  aladinLookupByIsbn13,
  aladinResolveBookMetadata,
} from "@/lib/aladinOpenApi"
import type { AladinSearchHit } from "@/types/aladin"

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      idToken?: string
      hit?: AladinSearchHit
      isbn13?: string
    }

    if (!body.idToken || !(await verifyFirebaseIdToken(body.idToken))) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 })
    }

    const isbnOnly = (body.isbn13 ?? "").trim()
    const metadata = body.hit?.title?.trim()
      ? await aladinResolveBookMetadata(body.hit)
      : isbnOnly
        ? await aladinLookupByIsbn13(isbnOnly)
        : null

    if (!metadata) {
      return NextResponse.json(
        { error: "검색 결과 또는 ISBN이 필요합니다." },
        { status: 400 },
      )
    }
    if (!metadata.title.trim()) {
      return NextResponse.json(
        { error: "알라딘에서 도서 정보를 찾지 못했습니다." },
        { status: 404 },
      )
    }

    return NextResponse.json({ metadata })
  } catch (e) {
    console.error("aladin lookup:", e)
    const message =
      e instanceof Error ? e.message : "알라딘 조회 중 오류가 발생했습니다."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
