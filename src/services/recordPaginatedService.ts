import type { DocumentData, QueryDocumentSnapshot } from "firebase/firestore"
import { ApiClient } from "@/lib/apiClient"
import type { Book } from "@/types/book"
import type { Critique, Quote } from "@/types/content"
import type { BookQuestion } from "@/types/question"
import type { RecordContent } from "@/services/recordService"
import { UserService } from "@/services/userService"

/** 기록 목록(구절·질문·리뷰·서평) 서버 페이지당 건수 */
export const RECORD_PAGE_SIZE = 10

const MAX_BOOK_IDS_IN = 30

function textPrefixRange(raw: string): { start: string; end: string } | null {
  const t = raw.trim()
  if (!t) return null
  return { start: t, end: `${t}\uf8ff` }
}

async function bookMap(ids: string[]): Promise<Map<string, Book>> {
  const uniq = [...new Set(ids)]
  const map = new Map<string, Book>()
  await Promise.all(
    uniq.map(async (id) => {
      const b = await ApiClient.getDocument<Book>("books", id)
      if (b) map.set(id, b)
    }),
  )
  return map
}

async function fillUserNames(records: RecordContent[]): Promise<void> {
  const uids = [...new Set(records.map((r) => r.user_id))]
  const entries = await Promise.all(
    uids.map(async (uid) => {
      const u = await UserService.getUser(uid)
      return [
        uid,
        u?.displayName || u?.email || "익명",
        u?.photoURL,
      ] as const
    }),
  )
  const nameBy = new Map(entries.map(([id, n]) => [id, n]))
  const photoBy = new Map(
    entries.map(([id, , p]) => [id, p as string | undefined]),
  )
  for (const r of records) {
    r.userName = nameBy.get(r.user_id) ?? "익명"
    r.userPhotoURL = photoBy.get(r.user_id)
  }
}

export async function fetchQuoteRecordsPage(options: {
  userUid: string
  showOnlyMine: boolean
  bookId?: string
  searchQuery: string
  startAfterSnapshot: QueryDocumentSnapshot<DocumentData> | null
}): Promise<{
  records: RecordContent[]
  nextCursor: QueryDocumentSnapshot<DocumentData> | null
  done: boolean
}> {
  const { userUid, showOnlyMine, bookId, searchQuery, startAfterSnapshot } =
    options
  const conditions: Array<[string, string, unknown]> = showOnlyMine
    ? [["user_id", "==", userUid]]
    : [["isPublic", "==", true]]
  if (bookId) conditions.push(["bookId", "==", bookId])
  const pr = textPrefixRange(searchQuery)
  if (pr) {
    conditions.push(["quoteText", ">=", pr.start])
    conditions.push(["quoteText", "<=", pr.end])
  }

  const batch = await ApiClient.queryCollectionPage<Quote>({
    collectionName: "quotes",
    conditions,
    orderByField: pr ? "quoteText" : "created_at",
    orderDirection: pr ? "asc" : "desc",
    pageSize: RECORD_PAGE_SIZE,
    startAfterSnapshot,
  })

  const books = await bookMap(batch.items.map((q) => q.bookId))
  const records: RecordContent[] = []
  for (const quote of batch.items) {
    const book = books.get(quote.bookId)
    if (!book) continue
    if (!showOnlyMine && !book.isBookPublic) continue
    if (showOnlyMine && book.user_id !== userUid) continue
    records.push({
      id: quote.id,
      contentType: "quote",
      bookId: quote.bookId,
      bookTitle: book.title,
      bookAuthor: book.author,
      user_id: quote.user_id,
      userName: "",
      content: quote.quoteText,
      likesCount: quote.likesCount || 0,
      commentsCount: quote.commentsCount || 0,
      created_at: quote.created_at,
      updated_at: quote.updated_at,
      bookStatus: book.status,
      bookCreatedAt: book.created_at,
    })
  }
  await fillUserNames(records)
  return {
    records,
    nextCursor: batch.lastVisible,
    done: !batch.hasMore,
  }
}

export async function fetchCritiqueRecordsPage(options: {
  userUid: string
  showOnlyMine: boolean
  bookId?: string
  searchQuery: string
  startAfterSnapshot: QueryDocumentSnapshot<DocumentData> | null
}): Promise<{
  records: RecordContent[]
  nextCursor: QueryDocumentSnapshot<DocumentData> | null
  done: boolean
}> {
  const { userUid, showOnlyMine, bookId, searchQuery, startAfterSnapshot } =
    options
  const conditions: Array<[string, string, unknown]> = showOnlyMine
    ? [["user_id", "==", userUid]]
    : [["isPublic", "==", true]]
  if (bookId) conditions.push(["bookId", "==", bookId])
  const pr = textPrefixRange(searchQuery)
  if (pr) {
    conditions.push(["content", ">=", pr.start])
    conditions.push(["content", "<=", pr.end])
  }

  const batch = await ApiClient.queryCollectionPage<Critique>({
    collectionName: "critiques",
    conditions,
    orderByField: pr ? "content" : "created_at",
    orderDirection: pr ? "asc" : "desc",
    pageSize: RECORD_PAGE_SIZE,
    startAfterSnapshot,
  })

  const books = await bookMap(batch.items.map((c) => c.bookId))
  const records: RecordContent[] = []
  for (const c of batch.items) {
    const book = books.get(c.bookId)
    if (!book) continue
    if (!showOnlyMine && !book.isBookPublic) continue
    if (showOnlyMine && book.user_id !== userUid) continue
    records.push({
      id: c.id,
      contentType: "critique",
      bookId: c.bookId,
      bookTitle: book.title,
      bookAuthor: book.author,
      user_id: c.user_id,
      userName: "",
      title: c.title,
      content: c.content,
      likesCount: c.likesCount || 0,
      commentsCount: c.commentsCount || 0,
      created_at: c.created_at,
      updated_at: c.updated_at,
      bookStatus: book.status,
      bookCreatedAt: book.created_at,
    })
  }
  await fillUserNames(records)
  return {
    records,
    nextCursor: batch.lastVisible,
    done: !batch.hasMore,
  }
}

export async function fetchQuestionRecordsPage(options: {
  showOnlyMine: boolean
  userUid: string
  bookId?: string
  /** 내 기록만·책 미선택 시: 내 서재 책 id(최대 30) — Firestore `in` 제한 */
  myOwnedBookIds?: string[]
  searchQuery: string
  startAfterSnapshot: QueryDocumentSnapshot<DocumentData> | null
}): Promise<{
  records: RecordContent[]
  nextCursor: QueryDocumentSnapshot<DocumentData> | null
  done: boolean
}> {
  const {
    showOnlyMine,
    userUid,
    bookId,
    myOwnedBookIds,
    searchQuery,
    startAfterSnapshot,
  } = options
  const conditions: Array<[string, string, unknown]> = []
  if (showOnlyMine) {
    if (bookId) {
      conditions.push(["bookId", "==", bookId])
    } else {
      const ids = (myOwnedBookIds ?? []).slice(0, MAX_BOOK_IDS_IN)
      if (ids.length === 0) {
        return { records: [], nextCursor: null, done: true }
      }
      conditions.push(["bookId", "in", ids])
    }
  } else {
    conditions.push(["isPublic", "==", true])
    if (bookId) conditions.push(["bookId", "==", bookId])
  }
  const pr = textPrefixRange(searchQuery)
  if (pr) {
    conditions.push(["questionText", ">=", pr.start])
    conditions.push(["questionText", "<=", pr.end])
  }

  const batch = await ApiClient.queryCollectionPage<BookQuestion & { user_id?: string }>({
    collectionName: "bookQuestions",
    conditions,
    orderByField: pr ? "questionText" : "created_at",
    orderDirection: pr ? "asc" : "desc",
    pageSize: RECORD_PAGE_SIZE,
    startAfterSnapshot,
  })

  const books = await bookMap(batch.items.map((q) => q.bookId))
  const records: RecordContent[] = []
  for (const question of batch.items) {
    const book = books.get(question.bookId)
    if (!book) continue
    if (!showOnlyMine && !book.isBookPublic) continue
    if (showOnlyMine && book.user_id !== userUid) continue
    const qUserId = question.user_id || book.user_id
    records.push({
      id: question.id,
      contentType: "question",
      bookId: question.bookId,
      bookTitle: book.title,
      bookAuthor: book.author,
      user_id: qUserId,
      userName: "",
      title: question.questionText,
      content: question.questionText,
      likesCount: question.likesCount || 0,
      commentsCount: question.commentsCount || 0,
      created_at: question.created_at,
      updated_at: question.updated_at,
      bookStatus: book.status,
      bookCreatedAt: book.created_at,
    })
  }
  await fillUserNames(records)
  return {
    records,
    nextCursor: batch.lastVisible,
    done: !batch.hasMore,
  }
}

export async function fetchReviewRecordsPage(options: {
  userUid: string
  showOnlyMine: boolean
  bookId?: string
  searchQuery: string
  startAfterSnapshot: QueryDocumentSnapshot<DocumentData> | null
}): Promise<{
  records: RecordContent[]
  nextCursor: QueryDocumentSnapshot<DocumentData> | null
  done: boolean
}> {
  const { userUid, showOnlyMine, bookId, searchQuery, startAfterSnapshot } =
    options

  if (bookId) {
    const book = await ApiClient.getDocument<Book>("books", bookId)
    if (
      !book?.review?.trim() ||
      (showOnlyMine && book.user_id !== userUid) ||
      (!showOnlyMine &&
        (!book.isBookPublic || book.reviewIsPublic !== true))
    ) {
      return { records: [], nextCursor: null, done: true }
    }
    const sq = searchQuery.trim().toLowerCase()
    if (sq) {
      const hay = [book.review, book.title, book.author]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
      if (!hay.includes(sq)) {
        return { records: [], nextCursor: null, done: true }
      }
    }
    const record: RecordContent = {
      id: book.id,
      contentType: "review",
      bookId: book.id,
      bookTitle: book.title,
      bookAuthor: book.author,
      user_id: book.user_id,
      userName: "",
      content: book.review!,
      likesCount: 0,
      commentsCount: 0,
      created_at: book.updated_at,
      updated_at: book.updated_at,
      bookStatus: book.status,
      bookCreatedAt: book.created_at,
    }
    await fillUserNames([record])
    return { records: [record], nextCursor: null, done: true }
  }

  const conditions: Array<[string, string, unknown]> = showOnlyMine
    ? [
        ["user_id", "==", userUid],
        ["review", ">", ""],
      ]
    : [
        ["reviewIsPublic", "==", true],
        ["review", ">", ""],
      ]

  const batch = await ApiClient.queryCollectionPage<Book>({
    collectionName: "books",
    conditions,
    orderByField: "updated_at",
    orderDirection: "desc",
    pageSize: RECORD_PAGE_SIZE,
    startAfterSnapshot,
  })

  const sq = searchQuery.trim().toLowerCase()
  const records: RecordContent[] = []
  for (const book of batch.items) {
    if (!book.review?.trim()) continue
    if (showOnlyMine && book.user_id !== userUid) continue
    if (!showOnlyMine && !book.isBookPublic) continue
    if (sq) {
      const hay = [book.review, book.title, book.author]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
      if (!hay.includes(sq)) continue
    }
    records.push({
      id: book.id,
      contentType: "review",
      bookId: book.id,
      bookTitle: book.title,
      bookAuthor: book.author,
      user_id: book.user_id,
      userName: "",
      content: book.review!,
      likesCount: 0,
      commentsCount: 0,
      created_at: book.updated_at,
      updated_at: book.updated_at,
      bookStatus: book.status,
      bookCreatedAt: book.created_at,
    })
  }
  await fillUserNames(records)
  return {
    records,
    nextCursor: batch.lastVisible,
    done: !batch.hasMore,
  }
}

export async function countQuoteRecordsPage(options: {
  userUid: string
  showOnlyMine: boolean
  bookId?: string
  searchQuery: string
}): Promise<number> {
  const { userUid, showOnlyMine, bookId, searchQuery } = options
  const conditions: Array<[string, string, unknown]> = showOnlyMine
    ? [["user_id", "==", userUid]]
    : [["isPublic", "==", true]]
  if (bookId) conditions.push(["bookId", "==", bookId])
  const pr = textPrefixRange(searchQuery)
  if (pr) {
    conditions.push(["quoteText", ">=", pr.start])
    conditions.push(["quoteText", "<=", pr.end])
  }
  return ApiClient.countCollection({
    collectionName: "quotes",
    conditions,
  })
}

export async function countQuestionRecordsPage(options: {
  showOnlyMine: boolean
  userUid: string
  bookId?: string
  myOwnedBookIds?: string[]
  searchQuery: string
}): Promise<number> {
  const { showOnlyMine, userUid: _userUid, bookId, myOwnedBookIds, searchQuery } =
    options
  void _userUid
  const conditions: Array<[string, string, unknown]> = []
  if (showOnlyMine) {
    if (bookId) {
      conditions.push(["bookId", "==", bookId])
    } else {
      const ids = (myOwnedBookIds ?? []).slice(0, MAX_BOOK_IDS_IN)
      if (ids.length === 0) return 0
      conditions.push(["bookId", "in", ids])
    }
  } else {
    conditions.push(["isPublic", "==", true])
    if (bookId) conditions.push(["bookId", "==", bookId])
  }
  const pr = textPrefixRange(searchQuery)
  if (pr) {
    conditions.push(["questionText", ">=", pr.start])
    conditions.push(["questionText", "<=", pr.end])
  }
  return ApiClient.countCollection({
    collectionName: "bookQuestions",
    conditions,
  })
}

export async function countCritiqueRecordsPage(options: {
  userUid: string
  showOnlyMine: boolean
  bookId?: string
  searchQuery: string
}): Promise<number> {
  const { userUid, showOnlyMine, bookId, searchQuery } = options
  const conditions: Array<[string, string, unknown]> = showOnlyMine
    ? [["user_id", "==", userUid]]
    : [["isPublic", "==", true]]
  if (bookId) conditions.push(["bookId", "==", bookId])
  const pr = textPrefixRange(searchQuery)
  if (pr) {
    conditions.push(["content", ">=", pr.start])
    conditions.push(["content", "<=", pr.end])
  }
  return ApiClient.countCollection({
    collectionName: "critiques",
    conditions,
  })
}

export async function countReviewRecordsPage(options: {
  userUid: string
  showOnlyMine: boolean
  bookId?: string
  searchQuery: string
}): Promise<number> {
  const { userUid, showOnlyMine, bookId, searchQuery } = options
  if (bookId) {
    const book = await ApiClient.getDocument<Book>("books", bookId)
    if (
      !book?.review?.trim() ||
      (showOnlyMine && book.user_id !== userUid) ||
      (!showOnlyMine &&
        (!book.isBookPublic || book.reviewIsPublic !== true))
    ) {
      return 0
    }
    const sq = searchQuery.trim().toLowerCase()
    if (sq) {
      const hay = [book.review, book.title, book.author]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
      if (!hay.includes(sq)) return 0
    }
    return 1
  }
  const conditions: Array<[string, string, unknown]> = showOnlyMine
    ? [
        ["user_id", "==", userUid],
        ["review", ">", ""],
      ]
    : [
        ["reviewIsPublic", "==", true],
        ["review", ">", ""],
      ]
  void searchQuery
  return ApiClient.countCollection({
    collectionName: "books",
    conditions,
  })
}
