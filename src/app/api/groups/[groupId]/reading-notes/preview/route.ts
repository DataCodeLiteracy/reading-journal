import { NextResponse } from "next/server"
import { getAdminFirestore } from "@/lib/firebaseAdmin"
import { fetchGroupReadingNotesPreview } from "@/lib/groupReadingNotesAdmin"
import { verifyFirebaseIdToken } from "@/lib/verifyFirebaseIdToken"

const NO_STORE_HEADERS = { "Cache-Control": "private, no-store, max-age=0" }

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: NO_STORE_HEADERS })
}

function errorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) {
    if (error.message === "MEMBER_REQUIRED") {
      return "이 독서모임을 볼 수 있는 활동 멤버가 아닙니다."
    }
    if (error.message === "GROUP_NOT_FOUND") {
      return "독서모임을 찾을 수 없습니다."
    }
    return error.message
  }
  return fallback
}

export async function GET(
  request: Request,
  context: { params: Promise<{ groupId: string }> },
) {
  try {
    const { groupId } = await context.params
    if (!groupId || !/^[A-Za-z0-9_-]{1,128}$/.test(groupId)) {
      return json({ error: "올바르지 않은 독서모임 ID입니다." }, 400)
    }

    const authorization = request.headers.get("authorization")
    const idToken = authorization?.startsWith("Bearer ")
      ? authorization.slice("Bearer ".length).trim()
      : ""
    const verified = await verifyFirebaseIdToken(idToken)
    if (!verified) return json({ error: "로그인이 필요합니다." }, 401)

    const url = new URL(request.url)
    const filters = {
      meetingId: url.searchParams.get("meeting")?.trim() || undefined,
      groupBookId: url.searchParams.get("book")?.trim() || undefined,
      memberUserId: url.searchParams.get("member")?.trim() || undefined,
    }

    const db = getAdminFirestore()
    const result = await fetchGroupReadingNotesPreview({
      db,
      groupId,
      viewerUserId: verified.uid,
      filters,
    })

    return json(result)
  } catch (error) {
    console.error("GET /api/groups/[groupId]/reading-notes/preview:", error)
    return json(
      { error: errorMessage(error, "독서 노트 미리보기를 불러오지 못했습니다.") },
      error instanceof Error && error.message === "GROUP_NOT_FOUND" ? 404 : 500,
    )
  }
}
