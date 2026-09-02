import { NextResponse } from "next/server"
import { searchBooksUnified } from "@/lib/bookLookupSearch"
import { verifyFirebaseIdToken } from "@/lib/verifyFirebaseIdToken"

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      idToken?: string
      query?: string
      maxResults?: number
    }

    if (!body.idToken || !(await verifyFirebaseIdToken(body.idToken))) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 })
    }

    const query = (body.query ?? "").trim()
    if (!query) {
      return NextResponse.json({ error: "검색어가 필요합니다." }, { status: 400 })
    }

    const items = await searchBooksUnified(query, body.maxResults ?? 25)
    return NextResponse.json({ items })
  } catch (e) {
    console.error("book lookup search:", e)
    const message =
      e instanceof Error ? e.message : "도서 검색 중 오류가 발생했습니다."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
