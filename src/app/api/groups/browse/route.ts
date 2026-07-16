import { NextResponse } from "next/server"
import { getAdminFirestore } from "@/lib/firebaseAdmin"
import { verifyFirebaseIdToken } from "@/lib/verifyFirebaseIdToken"
import type {
  BrowsableGroupBook,
  BrowsableGroupMeeting,
  BrowsableGroupPost,
  BrowsableMeetingBookAssignment,
  BrowsableReadingGroup,
  BrowsableReadingGroupDetail,
} from "@/types/readingGroup"
import type { BookLevel } from "@/types/book"

const NO_STORE_HEADERS = { "Cache-Control": "private, no-store, max-age=0" }
type OperationalPostType = BrowsableGroupPost["type"]
const OPERATIONAL_POST_TYPES = new Set<OperationalPostType>([
  "announcement",
  "group_rule",
  "reading_method",
  "discussion_rule",
])
const BOOK_LEVELS = new Set<BookLevel>([
  "유아",
  "초1",
  "초2",
  "초3",
  "초4",
  "초5",
  "초6",
  "중1",
  "중2",
  "중3",
  "고1",
  "고2",
  "고3",
  "성인",
])

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: NO_STORE_HEADERS })
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined
}

function isoString(value: unknown): string | undefined {
  if (typeof value === "string") {
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? undefined : date.toISOString()
  }
  if (value instanceof Date) return value.toISOString()
  if (
    value &&
    typeof value === "object" &&
    "toDate" in value &&
    typeof value.toDate === "function"
  ) {
    return value.toDate().toISOString()
  }
  return undefined
}

function isBookLevel(value: unknown): value is BookLevel {
  return typeof value === "string" && BOOK_LEVELS.has(value as BookLevel)
}

function isOperationalPostType(value: unknown): value is OperationalPostType {
  return (
    typeof value === "string" &&
    OPERATIONAL_POST_TYPES.has(value as OperationalPostType)
  )
}

function chunks<T>(items: T[], size: number): T[][] {
  const result: T[][] = []
  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size))
  }
  return result
}

function safeGroup(
  id: string,
  data: FirebaseFirestore.DocumentData,
  activeMemberCount: number,
  isMember: boolean,
): BrowsableReadingGroup {
  return {
    id,
    name: typeof data.name === "string" ? data.name : "이름 없는 독서모임",
    ...(optionalString(data.description) ? { description: data.description } : {}),
    status: ["active", "paused", "archived"].includes(data.status)
      ? data.status
      : "active",
    audience_levels: Array.isArray(data.audience_levels)
      ? data.audience_levels.filter(isBookLevel)
      : [],
    time_zone: optionalString(data.time_zone) ?? "Asia/Seoul",
    ...(typeof data.default_weekday === "number"
      ? { default_weekday: data.default_weekday }
      : {}),
    ...(optionalString(data.default_time) ? { default_time: data.default_time } : {}),
    ...(optionalString(data.default_location)
      ? { default_location: data.default_location }
      : {}),
    active_member_count: activeMemberCount,
    is_member: isMember,
  }
}

function safeBook(
  id: string,
  data: FirebaseFirestore.DocumentData,
): BrowsableGroupBook {
  const startDate = optionalString(data.start_date)
  const endDate = optionalString(data.end_date)
  return {
    id,
    canonical_book_id: optionalString(data.canonical_book_id) ?? "",
    title: optionalString(data.title) ?? "제목 없는 책",
    ...(optionalString(data.author) ? { author: data.author } : {}),
    ...(optionalString(data.cover_url) ? { cover_url: data.cover_url } : {}),
    ...(startDate ? { start_date: startDate } : {}),
    ...(endDate ? { end_date: endDate } : {}),
    status: [
      "planned",
      "on_hold",
      "reading",
      "reading_paused",
      "completed",
      "paused",
    ].includes(data.status)
      ? data.status
      : "planned",
    ...(typeof data.order === "number" ? { order: data.order } : {}),
    ...(optionalString(data.selected_reason)
      ? { selected_reason: data.selected_reason }
      : {}),
  }
}

function safeMeeting(
  id: string,
  data: FirebaseFirestore.DocumentData,
): BrowsableGroupMeeting {
  const allowedStatuses = ["draft", "scheduled", "in_progress", "completed", "cancelled"]
  const scheduledAt = isoString(data.scheduled_at)
  const endedAt = isoString(data.ended_at)
  return {
    id,
    sequence: typeof data.sequence === "number" ? data.sequence : 0,
    title: optionalString(data.title) ?? "제목 없는 일정",
    ...(scheduledAt ? { scheduled_at: scheduledAt } : {}),
    ...(endedAt ? { ended_at: endedAt } : {}),
    ...(optionalString(data.location) ? { location: data.location } : {}),
    status: allowedStatuses.includes(data.status) ? data.status : "draft",
    ...(optionalString(data.agenda) ? { agenda: data.agenda } : {}),
  }
}

function safeAssignment(
  id: string,
  data: FirebaseFirestore.DocumentData,
): BrowsableMeetingBookAssignment {
  const readingStartAt = isoString(data.reading_start_at)
  const readingEndAt = isoString(data.reading_end_at)
  const stoppedAt = isoString(data.stopped_at)
  const completedAt = isoString(data.completed_at)
  return {
    id,
    meeting_id: optionalString(data.meeting_id) ?? "",
    group_book_id: optionalString(data.group_book_id) ?? "",
    canonical_book_id: optionalString(data.canonical_book_id) ?? "",
    ...(readingStartAt ? { reading_start_at: readingStartAt } : {}),
    ...(readingEndAt ? { reading_end_at: readingEndAt } : {}),
    reading_range: optionalString(data.reading_range) ?? "",
    ...(stoppedAt ? { stopped_at: stoppedAt } : {}),
    ...(completedAt ? { completed_at: completedAt } : {}),
    ...(optionalString(data.book_title_snapshot)
      ? { book_title_snapshot: data.book_title_snapshot }
      : {}),
    ...(optionalString(data.book_author_snapshot)
      ? { book_author_snapshot: data.book_author_snapshot }
      : {}),
    ...(optionalString(data.book_cover_url_snapshot)
      ? { book_cover_url_snapshot: data.book_cover_url_snapshot }
      : {}),
    ...(typeof data.start_page === "number" ? { start_page: data.start_page } : {}),
    ...(typeof data.end_page === "number" ? { end_page: data.end_page } : {}),
    ...(Array.isArray(data.chapters)
      ? { chapters: data.chapters.filter((item: unknown) => typeof item === "string") }
      : {}),
  }
}

function safePost(
  id: string,
  data: FirebaseFirestore.DocumentData,
  type: OperationalPostType,
): BrowsableGroupPost {
  const publishedAt = isoString(data.published_at)
  return {
    id,
    type,
    title: optionalString(data.title) ?? "제목 없는 안내",
    content: typeof data.content === "string" ? data.content : "",
    is_pinned: data.is_pinned === true,
    ...(typeof data.version === "number" ? { version: data.version } : {}),
    ...(publishedAt ? { published_at: publishedAt } : {}),
  }
}

async function getMembershipSummary(groupIds: string[], uid: string) {
  const db = getAdminFirestore()
  const snapshots = await Promise.all(
    chunks(groupIds, 30).map((groupIdChunk) =>
      db
        .collection("readingGroupMembers")
        .where("group_id", "in", groupIdChunk)
        .get(),
    ),
  )
  const activeCounts = new Map<string, number>()
  const memberGroupIds = new Set<string>()
  snapshots.forEach((snapshot) => {
    snapshot.docs.forEach((document) => {
      const member = document.data()
      if (member.status !== "active" || typeof member.group_id !== "string") return
      activeCounts.set(member.group_id, (activeCounts.get(member.group_id) ?? 0) + 1)
      if (member.user_id === uid) memberGroupIds.add(member.group_id)
    })
  })
  return { activeCounts, memberGroupIds }
}

export async function GET(request: Request) {
  try {
    const authorization = request.headers.get("authorization")
    const idToken = authorization?.startsWith("Bearer ")
      ? authorization.slice("Bearer ".length).trim()
      : ""
    const verified = await verifyFirebaseIdToken(idToken)
    if (!verified) return json({ error: "로그인이 필요합니다." }, 401)

    const groupId = new URL(request.url).searchParams.get("groupId")?.trim()
    if (groupId && !/^[A-Za-z0-9_-]{1,128}$/.test(groupId)) {
      return json({ error: "올바르지 않은 독서모임 ID입니다." }, 400)
    }

    const db = getAdminFirestore()
    if (!groupId) {
      const groupSnapshot = await db
        .collection("readingGroups")
        .where("status", "in", ["active", "paused"])
        .get()
      const groupIds = groupSnapshot.docs.map((document) => document.id)
      const { activeCounts, memberGroupIds } = groupIds.length
        ? await getMembershipSummary(groupIds, verified.uid)
        : { activeCounts: new Map<string, number>(), memberGroupIds: new Set<string>() }
      const groups = groupSnapshot.docs
        .map((document) =>
          safeGroup(
            document.id,
            document.data(),
            activeCounts.get(document.id) ?? 0,
            memberGroupIds.has(document.id),
          ),
        )
        .sort(
          (left, right) =>
            left.name.localeCompare(right.name, "ko") || left.id.localeCompare(right.id),
        )
      return json({ groups })
    }

    const groupDocument = await db.collection("readingGroups").doc(groupId).get()
    if (!groupDocument.exists) {
      return json({ error: "독서모임을 찾을 수 없습니다." }, 404)
    }

    const members = await db
      .collection("readingGroupMembers")
      .where("group_id", "==", groupId)
      .get()
    const activeMembers = members.docs.filter(
      (document) => document.data().status === "active",
    )
    const isMember = activeMembers.some(
      (document) => document.data().user_id === verified.uid,
    )
    if (
      !["active", "paused"].includes(groupDocument.data()?.status) &&
      !isMember
    ) {
      return json({ error: "독서모임을 찾을 수 없습니다." }, 404)
    }

    const collections = [
      "readingGroupBooks",
      "readingGroupMeetings",
      "readingGroupMeetingBookAssignments",
      "readingGroupPosts",
    ] as const
    const [books, meetings, assignments, posts] = await Promise.all(
      collections.map((collectionName) =>
        db.collection(collectionName).where("group_id", "==", groupId).get(),
      ),
    )
    const detail: BrowsableReadingGroupDetail = {
      group: safeGroup(
        groupDocument.id,
        groupDocument.data()!,
        activeMembers.length,
        isMember,
      ),
      books: books.docs
        .map((document) => safeBook(document.id, document.data()))
        .sort(
          (left, right) =>
            (left.order ?? Number.MAX_SAFE_INTEGER) -
              (right.order ?? Number.MAX_SAFE_INTEGER) ||
            left.title.localeCompare(right.title, "ko"),
        ),
      meetings: meetings.docs
        .map((document) => safeMeeting(document.id, document.data()))
        .sort(
          (left, right) =>
            (left.scheduled_at ?? "").localeCompare(right.scheduled_at ?? "") ||
            left.sequence - right.sequence,
        ),
      assignments: assignments.docs.map((document) =>
        safeAssignment(document.id, document.data()),
      ),
      posts: posts.docs
        .flatMap((document) => {
          const data = document.data()
          return isOperationalPostType(data.type)
            ? [safePost(document.id, data, data.type)]
            : []
        })
        .sort(
          (left, right) =>
            Number(right.is_pinned) - Number(left.is_pinned) ||
            (right.published_at ?? "").localeCompare(left.published_at ?? ""),
        ),
    }
    return json(detail)
  } catch (error) {
    console.error("reading group browse:", error)
    return json({ error: "독서모임 정보를 불러오지 못했습니다." }, 500)
  }
}
