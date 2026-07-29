import type { DocumentData, QueryDocumentSnapshot } from "firebase/firestore"
import { ApiClient } from "@/lib/apiClient"
import { CanonicalBookService } from "@/services/canonicalBookService"
import type { Book } from "@/types/book"
import type { ExploreTitleGroup } from "@/types/explore"
import { normalizeBookDuplicateKey } from "@/utils/bookTitleKey"

const READ_BATCH = 100
const MAX_ROUNDS = 80

/** 탐색 목록 — book·canonical에 저장된 표지 URL 보강 */
export async function enrichExploreBooksCoverUrls(
  books: Book[],
): Promise<Book[]> {
  const missing = books.filter((b) => !b.coverUrl?.trim() && b.canonicalBookId)
  if (missing.length === 0) return books

  const ids = [...new Set(missing.map((b) => b.canonicalBookId!))]
  const coverById = new Map<string, string>()
  await Promise.all(
    ids.map(async (id) => {
      const canonical = await CanonicalBookService.getById(id)
      const url = canonical?.coverUrl?.trim()
      if (url) coverById.set(id, url)
    }),
  )
  if (coverById.size === 0) return books

  return books.map((b) => {
    if (b.coverUrl?.trim() || !b.canonicalBookId) return b
    const cover = coverById.get(b.canonicalBookId)
    return cover ? { ...b, coverUrl: cover } : b
  })
}

function buildGroup(books: Book[]): ExploreTitleGroup {
  const title = books[0]?.title?.trim() || ""
  const publisher = books[0]?.publisher?.trim() || ""
  const author = books[0]?.author || "저자 미상"
  const groupKey = normalizeBookDuplicateKey(title, publisher)
  const userCount = new Set(books.map((b) => b.user_id)).size
  const avgRating =
    books.reduce((s, b) => s + (b.rating ?? 0), 0) / books.length
  const statuses = new Set(books.map((b) => b.status))
  return {
    groupKey,
    title,
    publisher,
    books,
    author,
    userCount,
    avgRating,
    statuses,
    canonicalBookId: books.find((b) => b.canonicalBookId)?.canonicalBookId,
  }
}

export type ExploreTitleGroupsPageResult = {
  groups: ExploreTitleGroup[]
  nextPageCursor: QueryDocumentSnapshot<DocumentData> | null
  done: boolean
}

/**
 * `title` 오름/내림차순으로 books를 읽으며, 완결된 제목 그룹을 `groupsTarget`개 채울 때까지 Firestore를 순회합니다.
 */
export type ExploreTitlePageFirestoreCondition = [string, string, unknown]

export async function fetchExploreTitleGroupsPage(options: {
  groupsTarget: number
  orderTitle: "asc" | "desc"
  startAfterSnapshot: QueryDocumentSnapshot<DocumentData> | null
  /** `title` 정렬과 함께 사용할 Firestore equality 조건 (복합 인덱스 필요) */
  conditions?: ExploreTitlePageFirestoreCondition[]
}): Promise<ExploreTitleGroupsPageResult> {
  const {
    groupsTarget,
    orderTitle,
    startAfterSnapshot,
    conditions = [],
  } = options

  const completed: ExploreTitleGroup[] = []
  let openKey: string | null = null
  let openBooks: Book[] = []
  let openSnaps: QueryDocumentSnapshot<DocumentData>[] = []
  let lastSnapClosedLastGroup: QueryDocumentSnapshot<DocumentData> | null =
    null

  const flushOpen = () => {
    if (openKey !== null && openBooks.length > 0) {
      completed.push(buildGroup(openBooks))
      lastSnapClosedLastGroup = openSnaps[openSnaps.length - 1]!
    }
    openKey = null
    openBooks = []
    openSnaps = []
  }

  let firestoreCursor: QueryDocumentSnapshot<DocumentData> | null =
    startAfterSnapshot
  let rounds = 0

  while (completed.length < groupsTarget && rounds < MAX_ROUNDS) {
    rounds += 1
    const batch = await ApiClient.queryCollectionPage<Book>({
      collectionName: "books",
      conditions,
      orderByField: "title",
      orderDirection: orderTitle,
      pageSize: READ_BATCH,
      startAfterSnapshot: firestoreCursor,
    })

    if (batch.items.length === 0) {
      flushOpen()
      return {
        groups: completed.slice(0, groupsTarget),
        nextPageCursor: lastSnapClosedLastGroup,
        done: true,
      }
    }

    for (let i = 0; i < batch.items.length; i++) {
      const book = batch.items[i]!
      const snap = batch.snapshots[i]!
      const raw = (book.title || "").trim()
      if (!raw) continue
      const k = normalizeBookDuplicateKey(raw, book.publisher)

      if (openKey === null) {
        openKey = k
        openBooks = [book]
        openSnaps = [snap]
        continue
      }

      if (k === openKey) {
        openBooks.push(book)
        openSnaps.push(snap)
        continue
      }

      flushOpen()
      if (completed.length >= groupsTarget) {
        return {
          groups: completed.slice(0, groupsTarget),
          nextPageCursor: lastSnapClosedLastGroup,
          done: !batch.hasMore,
        }
      }

      openKey = k
      openBooks = [book]
      openSnaps = [snap]
    }

    firestoreCursor = batch.lastVisible
    if (!batch.hasMore) {
      flushOpen()
      return {
        groups: completed.slice(0, groupsTarget),
        nextPageCursor: lastSnapClosedLastGroup,
        done: true,
      }
    }
  }

  flushOpen()
  if (openBooks.length > 0 && completed.length < groupsTarget) {
    completed.push(buildGroup(openBooks))
    lastSnapClosedLastGroup = openSnaps[openSnaps.length - 1]!
  }

  return {
    groups: completed.slice(0, groupsTarget),
    nextPageCursor: lastSnapClosedLastGroup,
    done: true,
  }
}

export function buildExploreTitlePageConditions(params: {
  statusFilter: string
  levelFilter: string
  categoryFilter: string
  userIdFilter: string
}): ExploreTitlePageFirestoreCondition[] {
  const c: ExploreTitlePageFirestoreCondition[] = [
    ["isBookPublic", "==", true],
  ]
  if (params.statusFilter)
    c.push(["status", "==", params.statusFilter])
  if (params.levelFilter) c.push(["level", "==", params.levelFilter])
  if (params.categoryFilter)
    c.push(["categoryDepth2Id", "==", params.categoryFilter])
  const uid = params.userIdFilter.trim()
  if (uid) c.push(["user_id", "==", uid])
  return c
}

/** 탐색 «제목 그룹»이 아닐 때 단건 책 커서 페이지 (검색은 제목 접두 일치) */
export function exploreBooksFlatSortParams(
  sortBy: string,
  searchHasPrefix: boolean,
): { field: string; dir: "asc" | "desc" } {
  if (searchHasPrefix) return { field: "title", dir: "asc" }
  switch (sortBy) {
    case "recent-title":
      return { field: "created_at", dir: "desc" }
    case "title-asc":
      return { field: "title", dir: "asc" }
    case "title-desc":
      return { field: "title", dir: "desc" }
    case "rating-desc":
      return { field: "rating", dir: "desc" }
    case "author-asc":
      return { field: "author", dir: "asc" }
    case "users-desc":
      return { field: "created_at", dir: "desc" }
    case "users-asc":
      return { field: "created_at", dir: "asc" }
    default:
      return { field: "created_at", dir: "desc" }
  }
}

/** 탐색 단건 목록용 where (내 책 제외 `!=`는 넣지 않음 — `count`·소프트 제외에서 별도 처리) */
export function buildExploreBooksQueryConditions(params: {
  statusFilter: string
  levelFilter: string
  categoryFilter: string
  userIdFilter: string
  authorFilter: string
  minRatingFilter: string
  searchPrefix?: string
}): ExploreTitlePageFirestoreCondition[] {
  const c = buildExploreTitlePageConditions({
    statusFilter: params.statusFilter,
    levelFilter: params.levelFilter,
    categoryFilter: params.categoryFilter,
    userIdFilter: params.userIdFilter,
  })
  const sp = params.searchPrefix?.trim()
  if (sp) {
    c.push(["title", ">=", sp])
    c.push(["title", "<=", `${sp}\uf8ff`])
  }
  const author = params.authorFilter.trim()
  if (author) c.push(["author", "==", author])
  const minR = parseFloat(params.minRatingFilter)
  if (!Number.isNaN(minR) && minR > 0) c.push(["rating", ">=", minR])
  return c
}

export type ExploreBooksListParams = {
  statusFilter: string
  levelFilter: string
  categoryFilter: string
  userIdFilter: string
  authorFilter: string
  minRatingFilter: string
  onlyNotMineFilter: boolean
  searchPrefix?: string
  sortBy: string
  currentUserUid?: string | null
}

function listConditionsHasTitleRange(
  conds: ExploreTitlePageFirestoreCondition[],
): boolean {
  return conds.some((x) => x[0] === "title" && x[1] === ">=")
}

function listConditionsHasRatingMin(
  conds: ExploreTitlePageFirestoreCondition[],
): boolean {
  return conds.some((x) => x[0] === "rating" && x[1] === ">=")
}

/**
 * Firestore `user_id !=` 는 해당 필드로 먼저 orderBy 해야 해서, 제외 시 2단 정렬을 씁니다.
 */
export function getExploreBooksOrderByChain(params: {
  sortBy: string
  hasSearchPrefix: boolean
  firestoreExcludeMine: boolean
}): ReadonlyArray<{ field: string; direction: "asc" | "desc" }> {
  if (!params.firestoreExcludeMine) {
    // recent-title은 created_at 단일 정렬 — isBookPublic+created_at 복합 인덱스와 일치
    const { field, dir } = exploreBooksFlatSortParams(
      params.sortBy,
      params.hasSearchPrefix,
    )
    return [{ field, direction: dir }]
  }
  if (params.hasSearchPrefix) {
    return [
      { field: "user_id", direction: "asc" },
      { field: "title", direction: "asc" },
    ]
  }
  switch (params.sortBy) {
    case "recent-title":
      return [
        { field: "user_id", direction: "asc" },
        { field: "created_at", direction: "desc" },
      ]
    case "title-desc":
      return [
        { field: "user_id", direction: "asc" },
        { field: "title", direction: "desc" },
      ]
    case "title-asc":
      return [
        { field: "user_id", direction: "asc" },
        { field: "title", direction: "asc" },
      ]
    case "rating-desc":
      return [
        { field: "user_id", direction: "asc" },
        { field: "rating", direction: "desc" },
      ]
    case "author-asc":
      return [
        { field: "user_id", direction: "asc" },
        { field: "author", direction: "asc" },
      ]
    case "users-desc":
      return [
        { field: "user_id", direction: "asc" },
        { field: "created_at", direction: "desc" },
      ]
    case "users-asc":
      return [
        { field: "user_id", direction: "asc" },
        { field: "created_at", direction: "asc" },
      ]
    default:
      return [
        { field: "user_id", direction: "asc" },
        { field: "created_at", direction: "desc" },
      ]
  }
}

const SOFT_PAGE_READ = 50
const SOFT_PAGE_MAX_ROUNDS = 80

async function fetchExploreBooksPageSoftMineExclude(options: {
  conditions: ExploreTitlePageFirestoreCondition[]
  sortBy: string
  searchPrefix?: string
  pageSize: number
  startAfterSnapshot: QueryDocumentSnapshot<DocumentData> | null
  excludeUserId: string
}): Promise<{
  items: Book[]
  snapshots: QueryDocumentSnapshot<DocumentData>[]
  lastVisible: QueryDocumentSnapshot<DocumentData> | null
  hasMore: boolean
}> {
  const sp = options.searchPrefix?.trim()
  const hasSearch = Boolean(sp)
  const orderByChain = getExploreBooksOrderByChain({
    sortBy: options.sortBy,
    hasSearchPrefix: hasSearch,
    firestoreExcludeMine: false,
  })
  const { field, dir } = exploreBooksFlatSortParams(options.sortBy, hasSearch)
  const collected: Book[] = []
  const snaps: QueryDocumentSnapshot<DocumentData>[] = []
  let firestoreCursor: QueryDocumentSnapshot<DocumentData> | null =
    options.startAfterSnapshot
  let lastScanned: QueryDocumentSnapshot<DocumentData> | null = null
  let rounds = 0

  while (collected.length < options.pageSize && rounds < SOFT_PAGE_MAX_ROUNDS) {
    rounds += 1
    const batch = await ApiClient.queryCollectionPage<Book>({
      collectionName: "books",
      conditions: options.conditions,
      orderByChain,
      orderByField: field,
      orderDirection: dir,
      pageSize: SOFT_PAGE_READ,
      startAfterSnapshot: firestoreCursor,
    })
    if (batch.items.length === 0) {
      return {
        items: collected,
        snapshots: snaps,
        lastVisible: lastScanned,
        hasMore: false,
      }
    }
    for (let i = 0; i < batch.items.length; i++) {
      const book = batch.items[i]!
      const snap = batch.snapshots[i]!
      lastScanned = snap
      if (book.user_id !== options.excludeUserId) {
        collected.push(book)
        snaps.push(snap)
      }
      if (collected.length >= options.pageSize) {
        const moreInBatch = i + 1 < batch.items.length
        return {
          items: collected,
          snapshots: snaps,
          lastVisible: lastScanned,
          hasMore: moreInBatch || batch.hasMore,
        }
      }
    }
    firestoreCursor = batch.lastVisible
    if (!batch.hasMore) break
  }

  return {
    items: collected,
    snapshots: snaps,
    lastVisible: lastScanned,
    hasMore: false,
  }
}

/** 조건에 맞는 책 권수. «내 책 제외»는 (전체 − 내 uid 일치)로 같은 필터에서 정확히 계산 */
export async function countExploreBooksForExplore(
  params: ExploreBooksListParams,
): Promise<number> {
  const conds = buildExploreBooksQueryConditions({
    statusFilter: params.statusFilter,
    levelFilter: params.levelFilter,
    categoryFilter: params.categoryFilter,
    userIdFilter: params.userIdFilter,
    authorFilter: params.authorFilter,
    minRatingFilter: params.minRatingFilter,
    searchPrefix: params.searchPrefix,
  })
  const base = await ApiClient.countCollection({
    collectionName: "books",
    conditions: conds,
  })
  const me = params.currentUserUid?.trim()
  if (!params.onlyNotMineFilter || !me || params.userIdFilter.trim()) {
    return base
  }
  const mine = await ApiClient.countCollection({
    collectionName: "books",
    conditions: [...conds, ["user_id", "==", me]],
  })
  return Math.max(0, base - mine)
}

export async function fetchExploreBooksForExplore(
  params: ExploreBooksListParams & {
    pageSize: number
    startAfterSnapshot: QueryDocumentSnapshot<DocumentData> | null
  },
): Promise<{
  items: Book[]
  snapshots: QueryDocumentSnapshot<DocumentData>[]
  lastVisible: QueryDocumentSnapshot<DocumentData> | null
  hasMore: boolean
}> {
  const conds = buildExploreBooksQueryConditions({
    statusFilter: params.statusFilter,
    levelFilter: params.levelFilter,
    categoryFilter: params.categoryFilter,
    userIdFilter: params.userIdFilter,
    authorFilter: params.authorFilter,
    minRatingFilter: params.minRatingFilter,
    searchPrefix: params.searchPrefix,
  })
  const sp = params.searchPrefix?.trim()
  const hasSearch = Boolean(sp)
  const me = params.currentUserUid?.trim()
  const wantMineExcluded =
    Boolean(params.onlyNotMineFilter && me && !params.userIdFilter.trim())
  const titleRange = listConditionsHasTitleRange(conds)
  const ratingMin = listConditionsHasRatingMin(conds)
  const useFirestoreNotEqual =
    wantMineExcluded && !titleRange && !ratingMin

  if (wantMineExcluded && !useFirestoreNotEqual) {
    return fetchExploreBooksPageSoftMineExclude({
      conditions: conds,
      sortBy: params.sortBy,
      searchPrefix: params.searchPrefix,
      pageSize: params.pageSize,
      startAfterSnapshot: params.startAfterSnapshot,
      excludeUserId: me!,
    })
  }

  const qConds: ExploreTitlePageFirestoreCondition[] =
    useFirestoreNotEqual && me
      ? [...conds, ["user_id", "!=", me]]
      : conds

  const orderByChain = getExploreBooksOrderByChain({
    sortBy: params.sortBy,
    hasSearchPrefix: hasSearch,
    firestoreExcludeMine: useFirestoreNotEqual,
  })
  const { field, dir } = exploreBooksFlatSortParams(params.sortBy, hasSearch)

  return ApiClient.queryCollectionPage<Book>({
    collectionName: "books",
    conditions: qConds,
    orderByChain,
    orderByField: field,
    orderDirection: dir,
    pageSize: params.pageSize,
    startAfterSnapshot: params.startAfterSnapshot,
  })
}

const EDITION_PAGE_READ = 50
const EDITION_PAGE_MAX_ROUNDS = 80
const EDITION_COUNT_READ = 100
const EDITION_COUNT_MAX_ROUNDS = 100

function editionKeyOfBook(book: Book): string | null {
  const t = (book.title || "").trim()
  if (!t) return null
  return normalizeBookDuplicateKey(t, book.publisher)
}

/** 같은 판본의 공개 등록분을 모두 모아 등록 유저 목록이 카드에 맞게 채워지게 합니다. */
async function loadPublicBooksForEdition(
  title: string,
  publisher?: string,
): Promise<Book[]> {
  const trimmed = title.trim()
  if (!trimmed) return []
  const key = normalizeBookDuplicateKey(trimmed, publisher)
  const candidates = await ApiClient.queryDocuments<Book>(
    "books",
    [
      ["isBookPublic", "==", true],
      ["title", ">=", trimmed],
      ["title", "<=", `${trimmed}\uf8ff`],
    ],
    "title",
    "asc",
    200,
  )
  return candidates.filter(
    (b) => normalizeBookDuplicateKey(b.title, b.publisher) === key,
  )
}

async function enrichEditionGroupsWithAllRegistrants(
  groups: ExploreTitleGroup[],
): Promise<ExploreTitleGroup[]> {
  if (groups.length === 0) return groups
  return Promise.all(
    groups.map(async (group) => {
      try {
        const all = await loadPublicBooksForEdition(
          group.title,
          group.publisher || undefined,
        )
        if (all.length <= group.books.length) return group
        return buildGroup(all)
      } catch {
        return group
      }
    }),
  )
}

/**
 * 탐색 목록 — 판본(제목+출판사) 카드를 `groupsTarget`개 채울 때까지 books를 순회합니다.
 * 같은 판본은 카드 1장으로 묶고, 등록 유저는 카드 펼침에서 확인합니다.
 */
export async function fetchExploreEditionGroupsForExplore(
  params: ExploreBooksListParams & {
    groupsTarget: number
    startAfterSnapshot: QueryDocumentSnapshot<DocumentData> | null
    /** 이전 페이지에서 이미 보여 준 판본 키 */
    skipGroupKeys: ReadonlySet<string>
  },
): Promise<{
  groups: ExploreTitleGroup[]
  lastVisible: QueryDocumentSnapshot<DocumentData> | null
  hasMore: boolean
  pageGroupKeys: string[]
}> {
  const target = Math.max(1, params.groupsTarget)
  const byEdition = new Map<string, Book[]>()
  const orderKeys: string[] = []
  let firestoreCursor: QueryDocumentSnapshot<DocumentData> | null =
    params.startAfterSnapshot
  let lastAccepted: QueryDocumentSnapshot<DocumentData> | null = null
  let rounds = 0

  const finish = async (hasMore: boolean) => {
    const raw = orderKeys.map((k) => buildGroup(byEdition.get(k)!))
    const groups = await enrichEditionGroupsWithAllRegistrants(raw)
    return {
      groups,
      lastVisible: lastAccepted,
      hasMore,
      pageGroupKeys: orderKeys,
    }
  }

  while (rounds < EDITION_PAGE_MAX_ROUNDS) {
    rounds += 1
    const batch = await fetchExploreBooksForExplore({
      ...params,
      pageSize: EDITION_PAGE_READ,
      startAfterSnapshot: firestoreCursor,
    })

    if (batch.items.length === 0) {
      break
    }

    for (let i = 0; i < batch.items.length; i++) {
      const book = batch.items[i]!
      const snap = batch.snapshots[i]!
      const key = editionKeyOfBook(book)

      if (!key || params.skipGroupKeys.has(key)) {
        lastAccepted = snap
        continue
      }

      if (byEdition.has(key)) {
        byEdition.get(key)!.push(book)
        lastAccepted = snap
        continue
      }

      if (orderKeys.length >= target) {
        return finish(true)
      }

      byEdition.set(key, [book])
      orderKeys.push(key)
      lastAccepted = snap
    }

    firestoreCursor = batch.lastVisible
    if (!batch.hasMore) {
      break
    }
    if (orderKeys.length >= target) {
      return finish(true)
    }
  }

  return finish(false)
}

/** 조건에 맞는 고유 판본(제목+출판사) 개수 — 페이지 수 계산용 */
export async function countExploreEditionGroupsForExplore(
  params: ExploreBooksListParams,
): Promise<number> {
  const keys = new Set<string>()
  let cursor: QueryDocumentSnapshot<DocumentData> | null = null
  let rounds = 0

  while (rounds < EDITION_COUNT_MAX_ROUNDS) {
    rounds += 1
    const batch = await fetchExploreBooksForExplore({
      ...params,
      pageSize: EDITION_COUNT_READ,
      startAfterSnapshot: cursor,
    })
    if (batch.items.length === 0) break
    for (const book of batch.items) {
      const key = editionKeyOfBook(book)
      if (key) keys.add(key)
    }
    cursor = batch.lastVisible
    if (!batch.hasMore) break
  }

  return keys.size
}
