import type { Firestore, Timestamp } from "firebase-admin/firestore"
import {
  GROUP_READING_NOTES_PAGE_SIZE,
  GROUP_READING_NOTES_PREVIEW_SIZE,
} from "@/lib/groupReadingNotesConstants"
import type {
  GroupReadingNoteItem,
  GroupReadingNoteType,
} from "@/types/readingGroup"

export type GroupReadingNotesSort = "newest" | "oldest" | "member" | "type"

export type GroupReadingNotesFilters = {
  meetingId?: string
  groupBookId?: string
  memberUserId?: string
}

export type GroupReadingNoteItemDto = Omit<
  GroupReadingNoteItem,
  "createdAt"
> & {
  createdAt: string
}

type GroupContext = {
  members: Array<{
    user_id: string
    display_name?: string
    status?: string
  }>
  books: Array<{
    id: string
    canonical_book_id: string
    title: string
  }>
  assignments: Array<{
    meeting_id: string
    group_book_id: string
  }>
}

function toIso(value: unknown): string {
  if (
    value &&
    typeof value === "object" &&
    "toDate" in value &&
    typeof (value as Timestamp).toDate === "function"
  ) {
    return (value as Timestamp).toDate().toISOString()
  }
  if (value instanceof Date) return value.toISOString()
  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value)
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString()
  }
  return new Date(0).toISOString()
}

function toDate(value: unknown): Date {
  return new Date(toIso(value))
}

function memberLabel(displayName?: string) {
  return displayName?.trim() || "모임원"
}

function isVisible(
  isPublic: boolean,
  ownerUserId: string,
  viewerUserId: string,
) {
  return isPublic || ownerUserId === viewerUserId
}

function serialize(item: GroupReadingNoteItem): GroupReadingNoteItemDto {
  return {
    ...item,
    createdAt: item.createdAt.toISOString(),
  }
}

function sortItems(
  items: GroupReadingNoteItem[],
  sort: GroupReadingNotesSort,
): GroupReadingNoteItem[] {
  const sorted = [...items]
  switch (sort) {
    case "oldest":
      sorted.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      break
    case "member":
      sorted.sort(
        (a, b) =>
          a.displayName.localeCompare(b.displayName, "ko") ||
          b.createdAt.getTime() - a.createdAt.getTime(),
      )
      break
    case "type": {
      const label: Record<GroupReadingNoteType, string> = {
        quote: "구절",
        question: "질문",
        review: "리뷰",
        critique: "서평",
      }
      sorted.sort(
        (a, b) =>
          label[a.recordType].localeCompare(label[b.recordType], "ko") ||
          b.createdAt.getTime() - a.createdAt.getTime(),
      )
      break
    }
    default:
      sorted.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  }
  return sorted
}

function applyFilters(
  items: GroupReadingNoteItem[],
  filters: GroupReadingNotesFilters,
  recordType?: GroupReadingNoteType,
): GroupReadingNoteItem[] {
  let list = items
  if (recordType) {
    list = list.filter((item) => item.recordType === recordType)
  }
  if (filters.meetingId) {
    list = list.filter((item) => item.meetingId === filters.meetingId)
  }
  if (filters.groupBookId) {
    list = list.filter((item) => item.groupBookId === filters.groupBookId)
  }
  if (filters.memberUserId) {
    list = list.filter((item) => item.userId === filters.memberUserId)
  }
  return list
}

async function loadGroupContext(
  db: Firestore,
  groupId: string,
): Promise<GroupContext | null> {
  const groupDoc = await db.collection("readingGroups").doc(groupId).get()
  if (!groupDoc.exists) return null

  const [membersSnap, booksSnap, assignmentsSnap] = await Promise.all([
    db
      .collection("readingGroupMembers")
      .where("group_id", "==", groupId)
      .where("status", "==", "active")
      .get(),
    db.collection("readingGroupBooks").where("group_id", "==", groupId).get(),
    db
      .collection("readingGroupMeetingBookAssignments")
      .where("group_id", "==", groupId)
      .get(),
  ])

  return {
    members: membersSnap.docs.map((doc) => doc.data() as GroupContext["members"][0]),
    books: booksSnap.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as Omit<GroupContext["books"][0], "id">),
    })),
    assignments: assignmentsSnap.docs.map(
      (doc) => doc.data() as GroupContext["assignments"][0],
    ),
  }
}

async function notesForMemberBooks(
  db: Firestore,
  member: GroupContext["members"][0],
  matchingBooks: Array<{
    id: string
    title: string
    canonicalBookId?: string
    review?: string
    reviewIsPublic?: boolean
    created_at?: unknown
    updated_at?: unknown
  }>,
  groupBookByCanonical: Map<string, GroupContext["books"][0]>,
  bookToMeeting: Map<string, string>,
  viewerUserId: string,
  recordTypes: Set<GroupReadingNoteType>,
): Promise<GroupReadingNoteItem[]> {
  const userId = member.user_id
  const displayName = memberLabel(member.display_name)
  const items: GroupReadingNoteItem[] = []

  await Promise.all(
    matchingBooks.map(async (book) => {
      const groupBook = book.canonicalBookId
        ? groupBookByCanonical.get(book.canonicalBookId)
        : undefined
      if (!groupBook) return

      const meetingId = bookToMeeting.get(groupBook.id)
      const base = `/book/${book.id}/${userId}`

      const [quotesSnap, questionsSnap, critiquesSnap] = await Promise.all([
        recordTypes.has("quote")
          ? db.collection("quotes").where("bookId", "==", book.id).get()
          : Promise.resolve(null),
        recordTypes.has("question")
          ? db.collection("bookQuestions").where("bookId", "==", book.id).get()
          : Promise.resolve(null),
        recordTypes.has("critique")
          ? db.collection("critiques").where("bookId", "==", book.id).get()
          : Promise.resolve(null),
      ])

      quotesSnap?.docs.forEach((doc) => {
        const quote = doc.data()
        if (!isVisible(Boolean(quote.isPublic), userId, viewerUserId)) return
        items.push({
          id: `quote:${doc.id}`,
          recordType: "quote",
          userId,
          displayName,
          groupBookId: groupBook.id,
          canonicalBookId: groupBook.canonical_book_id,
          bookTitle: book.title,
          personalBookId: book.id,
          meetingId,
          title: "구절",
          excerpt: String(quote.quoteText ?? ""),
          isPublic: Boolean(quote.isPublic),
          createdAt: toDate(quote.created_at),
          detailHref: `${base}/quotes/${doc.id}`,
        })
      })

      questionsSnap?.docs.forEach((doc) => {
        const question = doc.data()
        if (!isVisible(Boolean(question.isPublic), userId, viewerUserId)) return
        items.push({
          id: `question:${doc.id}`,
          recordType: "question",
          userId,
          displayName,
          groupBookId: groupBook.id,
          canonicalBookId: groupBook.canonical_book_id,
          bookTitle: book.title,
          personalBookId: book.id,
          meetingId,
          title: "질문",
          excerpt: String(question.questionText ?? ""),
          isPublic: Boolean(question.isPublic),
          createdAt: toDate(question.created_at),
          detailHref: `${base}/questions/${doc.id}`,
        })
      })

      critiquesSnap?.docs.forEach((doc) => {
        const critique = doc.data()
        if (!isVisible(Boolean(critique.isPublic), userId, viewerUserId)) return
        items.push({
          id: `critique:${doc.id}`,
          recordType: "critique",
          userId,
          displayName,
          groupBookId: groupBook.id,
          canonicalBookId: groupBook.canonical_book_id,
          bookTitle: book.title,
          personalBookId: book.id,
          meetingId,
          title: critique.title?.trim() || "서평",
          excerpt: String(critique.content ?? ""),
          isPublic: Boolean(critique.isPublic),
          createdAt: toDate(critique.created_at),
          detailHref: `${base}/critiques/${doc.id}`,
        })
      })

      if (
        recordTypes.has("review") &&
        book.review?.trim() &&
        isVisible(Boolean(book.reviewIsPublic), userId, viewerUserId)
      ) {
        items.push({
          id: `review:${book.id}`,
          recordType: "review",
          userId,
          displayName,
          groupBookId: groupBook.id,
          canonicalBookId: groupBook.canonical_book_id,
          bookTitle: book.title,
          personalBookId: book.id,
          meetingId,
          title: "독서 리뷰",
          excerpt: book.review.trim(),
          isPublic: Boolean(book.reviewIsPublic),
          createdAt: toDate(book.updated_at ?? book.created_at),
          detailHref: `${base}/review`,
        })
      }
    }),
  )

  return items
}

async function collectNotes(
  db: Firestore,
  context: GroupContext,
  viewerUserId: string,
  recordTypes: GroupReadingNoteType[],
): Promise<GroupReadingNoteItem[]> {
  const typeSet = new Set(recordTypes)
  const groupBookByCanonical = new Map(
    context.books.map((book) => [book.canonical_book_id, book]),
  )
  const canonicalIds = new Set(context.books.map((book) => book.canonical_book_id))
  const bookToMeeting = new Map<string, string>()
  context.assignments.forEach((assignment) => {
    bookToMeeting.set(assignment.group_book_id, assignment.meeting_id)
  })

  const activeMembers = context.members.filter((member) => member.user_id)

  const memberResults = await Promise.all(
    activeMembers.map(async (member) => {
      const booksSnap = await db
        .collection("books")
        .where("user_id", "==", member.user_id)
        .get()
      const matchingBooks = booksSnap.docs
        .map((doc) => ({
          id: doc.id,
          ...(doc.data() as {
            title?: string
            canonicalBookId?: string
            review?: string
            reviewIsPublic?: boolean
            created_at?: unknown
            updated_at?: unknown
          }),
        }))
        .filter(
          (book) =>
            book.canonicalBookId && canonicalIds.has(book.canonicalBookId),
        )
        .map((book) => ({
          ...book,
          title: book.title ?? "제목 없음",
        }))

      return notesForMemberBooks(
        db,
        member,
        matchingBooks,
        groupBookByCanonical,
        bookToMeeting,
        viewerUserId,
        typeSet,
      )
    }),
  )

  return memberResults.flat()
}

export async function assertGroupReadingNotesAccess(
  db: Firestore,
  groupId: string,
  viewerUserId: string,
): Promise<GroupContext> {
  const memberDoc = await db
    .collection("readingGroupMembers")
    .doc(`${groupId}__${viewerUserId}`)
    .get()
  if (!memberDoc.exists || memberDoc.data()?.status !== "active") {
    throw new Error("MEMBER_REQUIRED")
  }

  const context = await loadGroupContext(db, groupId)
  if (!context) throw new Error("GROUP_NOT_FOUND")
  return context
}

export async function fetchGroupReadingNotesPage(input: {
  db: Firestore
  groupId: string
  viewerUserId: string
  recordType: GroupReadingNoteType
  page?: number
  pageSize?: number
  filters?: GroupReadingNotesFilters
  sort?: GroupReadingNotesSort
}): Promise<{
  items: GroupReadingNoteItemDto[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}> {
  const pageSize = input.pageSize ?? GROUP_READING_NOTES_PAGE_SIZE
  const page = Math.max(1, input.page ?? 1)
  const sort = input.sort ?? "newest"
  const filters = input.filters ?? {}

  const context = await assertGroupReadingNotesAccess(
    input.db,
    input.groupId,
    input.viewerUserId,
  )

  const allItems = await collectNotes(
    input.db,
    context,
    input.viewerUserId,
    [input.recordType],
  )
  const filtered = sortItems(
    applyFilters(allItems, filters, input.recordType),
    sort,
  )
  const total = filtered.length
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const safePage = Math.min(page, totalPages)
  const start = (safePage - 1) * pageSize
  const items = filtered.slice(start, start + pageSize).map(serialize)

  return { items, total, page: safePage, pageSize, totalPages }
}

export async function fetchGroupReadingNotesPreview(input: {
  db: Firestore
  groupId: string
  viewerUserId: string
  filters?: GroupReadingNotesFilters
  limitPerType?: number
}): Promise<{
  sections: Record<GroupReadingNoteType, GroupReadingNoteItemDto[]>
  totals: Record<GroupReadingNoteType, number>
}> {
  const limitPerType = input.limitPerType ?? GROUP_READING_NOTES_PREVIEW_SIZE
  const filters = input.filters ?? {}

  const context = await assertGroupReadingNotesAccess(
    input.db,
    input.groupId,
    input.viewerUserId,
  )

  const allItems = await collectNotes(
    input.db,
    context,
    input.viewerUserId,
    ["quote", "question", "review", "critique"],
  )

  const sections = {} as Record<GroupReadingNoteType, GroupReadingNoteItemDto[]>
  const totals = {} as Record<GroupReadingNoteType, number>

  for (const recordType of ["quote", "question", "review", "critique"] as const) {
    const filtered = applyFilters(allItems, filters, recordType)
    const sorted = sortItems(filtered, "newest")
    totals[recordType] = sorted.length
    sections[recordType] = sorted
      .slice(0, limitPerType)
      .map(serialize)
  }

  return { sections, totals }
}
