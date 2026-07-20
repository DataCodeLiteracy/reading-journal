import { NextResponse } from "next/server"
import { getAdminFirestore } from "@/lib/firebaseAdmin"
import {
  fetchGroupReadingNotesPage,
  type GroupReadingNotesSort,
} from "@/lib/groupReadingNotesAdmin"
import { GROUP_READING_NOTES_PAGE_SIZE } from "@/lib/groupReadingNotesConstants"
import { verifyFirebaseIdToken } from "@/lib/verifyFirebaseIdToken"
import type { GroupReadingNoteType } from "@/types/readingGroup"

const NO_STORE_HEADERS = { "Cache-Control": "private, no-store, max-age=0" }

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: NO_STORE_HEADERS })
}

const NOTE_TYPES = new Set<GroupReadingNoteType>([
  "quote",
  "question",
  "review",
  "critique",
])

const SORT_KEYS = new Set<GroupReadingNotesSort>([
  "newest",
  "oldest",
  "member",
  "type",
])

function parsePositiveInt(value: string | null, fallback: number) {
  const parsed = Number.parseInt(value ?? "", 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
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
    const recordType = url.searchParams.get("type")?.trim() as
      | GroupReadingNoteType
      | undefined
    if (!recordType || !NOTE_TYPES.has(recordType)) {
      return json({ error: "기록 유형(type)을 지정해 주세요." }, 400)
    }

    const sortParam = url.searchParams.get("sort")?.trim() as
      | GroupReadingNotesSort
      | undefined
    const sort =
      sortParam && SORT_KEYS.has(sortParam) ? sortParam : "newest"

    const page = parsePositiveInt(url.searchParams.get("page"), 1)
    const pageSize = Math.min(
      parsePositiveInt(
        url.searchParams.get("pageSize"),
        GROUP_READING_NOTES_PAGE_SIZE,
      ),
      50,
    )

    const filters = {
      meetingId: url.searchParams.get("meeting")?.trim() || undefined,
      groupBookId: url.searchParams.get("book")?.trim() || undefined,
      memberUserId: url.searchParams.get("member")?.trim() || undefined,
    }

    const db = getAdminFirestore()
    const result = await fetchGroupReadingNotesPage({
      db,
      groupId,
      viewerUserId: verified.uid,
      recordType,
      page,
      pageSize,
      filters,
      sort,
    })

    return json(result)
  } catch (error) {
    console.error("GET /api/groups/[groupId]/reading-notes:", error)
    return json(
      { error: errorMessage(error, "독서 노트를 불러오지 못했습니다.") },
      error instanceof Error && error.message === "GROUP_NOT_FOUND" ? 404 : 500,
    )
  }
}
