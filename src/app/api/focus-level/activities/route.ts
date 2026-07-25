import { NextResponse } from "next/server"
import { verifyFocusLevelIdToken } from "@/lib/verifyFocusLevelIdToken"

/**
 * focus-level 활동 목록 프록시
 * POST { focusLevelIdToken }
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { focusLevelIdToken?: string }
    const token = body.focusLevelIdToken?.trim()
    if (!token) {
      return NextResponse.json(
        { error: "focusLevelIdToken이 필요합니다." },
        { status: 400 },
      )
    }

    const verified = await verifyFocusLevelIdToken(token)
    if (!verified) {
      return NextResponse.json(
        { error: "focus-level 로그인이 유효하지 않습니다." },
        { status: 401 },
      )
    }

    const base =
      process.env.FOCUS_LEVEL_API_BASE_URL?.trim() ||
      process.env.NEXT_PUBLIC_FOCUS_LEVEL_API_BASE_URL?.trim() ||
      "https://focus-level.vercel.app"

    const upstreamUrl = `${base.replace(/\/$/, "")}/api/external/activities`
    const upstream = await fetch(upstreamUrl, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    })
    const result = (await upstream.json().catch(() => ({}))) as {
      error?: string
      activities?: unknown[]
      userId?: string
    }
    if (!upstream.ok) {
      const detail =
        typeof result.error === "string"
          ? result.error
          : upstream.status === 404
            ? "focus-level에 /api/external/activities 가 없습니다. focus-level을 먼저 배포하세요."
            : `활동 목록을 불러오지 못했습니다. (${upstream.status})`
      console.error("[focus-level/activities] upstream", upstream.status, upstreamUrl, result)
      return NextResponse.json(
        { error: detail },
        { status: upstream.status >= 400 ? upstream.status : 502 },
      )
    }
    return NextResponse.json({
      ...result,
      focusEmail: verified.email ?? null,
    })
  } catch (error) {
    console.error("[focus-level/activities]", error)
    return NextResponse.json(
      { error: "활동 목록을 불러오지 못했습니다." },
      { status: 500 },
    )
  }
}
