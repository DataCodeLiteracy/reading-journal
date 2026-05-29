import { NextResponse } from "next/server"
import { verifyFirebaseIdToken } from "@/lib/verifyFirebaseIdToken"
import { aladinSearchByTitle } from "@/lib/aladinOpenApi"

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

    const items = await aladinSearchByTitle(query, body.maxResults ?? 25)
    return NextResponse.json({ items })
  } catch (e) {
    console.error("aladin search:", e)
    const message =
      e instanceof Error ? e.message : "알라딘 검색 중 오류가 발생했습니다."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
