import type { DocumentData, QueryDocumentSnapshot } from "firebase/firestore"
import { ApiClient } from "@/lib/apiClient"
import type { Book } from "@/types/book"
import type { CanonicalBook } from "@/types/canonicalBook"
import type { ExploreTitleGroup } from "@/types/explore"
import type { ExploreBooksListParams } from "@/services/explorePaginatedService"
import {
  countExploreEditionGroupsForExplore,
  fetchExploreEditionGroupsForExplore,
} from "@/services/explorePaginatedService"

const COLLECTION = "canonicalBooks"
const SOFT_READ = 25
const SOFT_MAX_ROUNDS = 40

export type ExploreCanonicalListParams = ExploreBooksListParams

/** 상태·평점 필터/정렬은 books 필드라 기존 books 스캔 경로로 둡니다. */
export function exploreNeedsBooksBackedQuery(
  params: ExploreCanonicalListParams,
): boolean {
  const minR = parseFloat(params.minRatingFilter)
  return Boolean(
    params.statusFilter ||
      (!Number.isNaN(minR) && minR > 0) ||
      params.sortBy === "rating-desc",
  )
}

function canonicalSortField(
  sortBy: string,
  hasSearchPrefix: boolean,
): { field: string; dir: "asc" | "desc" } {
  if (hasSearchPrefix) return { field: "title", dir: "asc" }
  switch (sortBy) {
    case "title-asc":
      return { field: "title", dir: "asc" }
    case "title-desc":
      return { field: "title", dir: "desc" }
    case "author-asc":
      return { field: "author", dir: "asc" }
    case "users-desc":
      return { field: "registrantCount", dir: "desc" }
    case "users-asc":
      return { field: "registrantCount", dir: "asc" }
    case "recent-title":
    default:
      return { field: "created_at", dir: "desc" }
  }
}

function buildCanonicalConditions(
  params: ExploreCanonicalListParams,
): Array<[string, string, unknown]> {
  const c: Array<[string, string, unknown]> = []
  const sp = params.searchPrefix?.trim()
  if (sp) {
    c.push(["title", ">=", sp])
    c.push(["title", "<=", `${sp}\uf8ff`])
  }
  if (params.authorFilter.trim()) {
    c.push(["author", "==", params.authorFilter.trim()])
  }
  if (params.levelFilter) {
    c.push(["level", "==", params.levelFilter])
  }
  if (params.categoryFilter) {
    c.push(["categoryDepth2Id", "==", params.categoryFilter])
  }
  const uid = params.userIdFilter.trim()
  if (uid) {
    c.push(["user_ids", "array-contains", uid])
  }
  return c
}

/** 판본 문서 → 탐색 카드용 그룹 (목록 단계에서는 seed book 1권만) */
export function exploreGroupFromCanonical(
  canonical: CanonicalBook,
): ExploreTitleGroup {
  const seed = seedBookFromCanonical(canonical)
  const userCount =
    canonical.registrantCount ??
    new Set(canonical.user_ids ?? []).size
  return {
    groupKey: canonical.editionKey || canonical.id,
    title: canonical.title.trim(),
    publisher: canonical.publisher?.trim() || "",
    books: [seed],
    author: canonical.author?.trim() || "저자 미상",
    userCount,
    avgRating: 0,
    statuses: new Set(),
    coverUrl: canonical.coverUrl?.trim() || undefined,
    canonicalBookId: canonical.id,
  }
}

export function seedBookFromCanonical(canonical: CanonicalBook): Book {
  return {
    id: `canonical-seed:${canonical.id}`,
    user_id: canonical.user_ids[0] ?? "",
    title: canonical.title,
    author: canonical.author ?? "",
    publisher: canonical.publisher,
    publishedDate: canonical.publishedDate ?? "",
    status: "want-to-read",
    rating: 0,
    hasStartedReading: false,
    canonicalBookId: canonical.id,
    editionKey: canonical.editionKey,
    coverUrl: canonical.coverUrl,
    level: canonical.level,
    categoryDepth1Id: canonical.categoryDepth1Id,
    categoryDepth1Label: canonical.categoryDepth1Label,
    categoryDepth2Id: canonical.categoryDepth2Id,
    categoryDepth2Label: canonical.categoryDepth2Label,
  }
}

function shouldSkipMine(
  canonical: CanonicalBook,
  params: ExploreCanonicalListParams,
): boolean {
  if (!params.onlyNotMineFilter) return false
  const me = params.currentUserUid?.trim()
  if (!me || params.userIdFilter.trim()) return false
  return (canonical.user_ids ?? []).includes(me)
}

async function fetchCanonicalPageRaw(options: {
  conditions: Array<[string, string, unknown]>
  sortBy: string
  hasSearchPrefix: boolean
  pageSize: number
  startAfterSnapshot: QueryDocumentSnapshot<DocumentData> | null
}): Promise<{
  items: CanonicalBook[]
  snapshots: QueryDocumentSnapshot<DocumentData>[]
  lastVisible: QueryDocumentSnapshot<DocumentData> | null
  hasMore: boolean
}> {
  const { field, dir } = canonicalSortField(
    options.sortBy,
    options.hasSearchPrefix,
  )
  return ApiClient.queryCollectionPage<CanonicalBook>({
    collectionName: COLLECTION,
    conditions: options.conditions,
    orderByField: field,
    orderDirection: dir,
    pageSize: options.pageSize,
    startAfterSnapshot: options.startAfterSnapshot,
  })
}

/**
 * 판본 문서 limit 기반 페이지.
 * «내 책 제외»만 소프트 스킵(판본 문서 단위)하고, 그 외는 쿼리 limit ≈ 페이지 크기.
 */
export async function fetchExploreCanonicalGroupsPage(
  params: ExploreCanonicalListParams & {
    pageSize: number
    startAfterSnapshot: QueryDocumentSnapshot<DocumentData> | null
    skipGroupKeys?: ReadonlySet<string>
  },
): Promise<{
  groups: ExploreTitleGroup[]
  lastVisible: QueryDocumentSnapshot<DocumentData> | null
  hasMore: boolean
  pageGroupKeys: string[]
}> {
  if (exploreNeedsBooksBackedQuery(params)) {
    const legacy = await fetchExploreEditionGroupsForExplore({
      ...params,
      groupsTarget: params.pageSize,
      startAfterSnapshot: params.startAfterSnapshot,
      skipGroupKeys: params.skipGroupKeys ?? new Set(),
    })
    return {
      groups: legacy.groups,
      lastVisible: legacy.lastVisible,
      hasMore: legacy.hasMore,
      pageGroupKeys: legacy.pageGroupKeys,
    }
  }

  const conditions = buildCanonicalConditions(params)
  const hasSearch = Boolean(params.searchPrefix?.trim())
  const wantSoftMine =
    Boolean(params.onlyNotMineFilter && params.currentUserUid?.trim()) &&
    !params.userIdFilter.trim()

  if (!wantSoftMine) {
    const page = await fetchCanonicalPageRaw({
      conditions,
      sortBy: params.sortBy,
      hasSearchPrefix: hasSearch,
      pageSize: params.pageSize,
      startAfterSnapshot: params.startAfterSnapshot,
    })
    const groups = page.items.map(exploreGroupFromCanonical)
    return {
      groups,
      lastVisible: page.lastVisible,
      hasMore: page.hasMore,
      pageGroupKeys: groups.map((g) => g.groupKey),
    }
  }

  const collected: CanonicalBook[] = []
  let cursor = params.startAfterSnapshot
  let lastAccepted: QueryDocumentSnapshot<DocumentData> | null = null
  let rounds = 0

  while (collected.length < params.pageSize && rounds < SOFT_MAX_ROUNDS) {
    rounds += 1
    const batch = await fetchCanonicalPageRaw({
      conditions,
      sortBy: params.sortBy,
      hasSearchPrefix: hasSearch,
      pageSize: SOFT_READ,
      startAfterSnapshot: cursor,
    })
    if (batch.items.length === 0) {
      const groups = collected.map(exploreGroupFromCanonical)
      return {
        groups,
        lastVisible: lastAccepted,
        hasMore: false,
        pageGroupKeys: groups.map((g) => g.groupKey),
      }
    }
    for (let i = 0; i < batch.items.length; i++) {
      const item = batch.items[i]!
      const snap = batch.snapshots[i]!
      lastAccepted = snap
      if (shouldSkipMine(item, params)) continue
      collected.push(item)
      if (collected.length >= params.pageSize) {
        const moreInBatch = i + 1 < batch.items.length
        const groups = collected.map(exploreGroupFromCanonical)
        return {
          groups,
          lastVisible: lastAccepted,
          hasMore: moreInBatch || batch.hasMore,
          pageGroupKeys: groups.map((g) => g.groupKey),
        }
      }
    }
    cursor = batch.lastVisible
    if (!batch.hasMore) break
  }

  const groups = collected.map(exploreGroupFromCanonical)
  return {
    groups,
    lastVisible: lastAccepted,
    hasMore: false,
    pageGroupKeys: groups.map((g) => g.groupKey),
  }
}

export async function countExploreCanonicalGroups(
  params: ExploreCanonicalListParams,
): Promise<number> {
  if (exploreNeedsBooksBackedQuery(params)) {
    return countExploreEditionGroupsForExplore(params)
  }

  const conditions = buildCanonicalConditions(params)
  const base = await ApiClient.countCollection({
    collectionName: COLLECTION,
    conditions,
  })

  const me = params.currentUserUid?.trim()
  if (!params.onlyNotMineFilter || !me || params.userIdFilter.trim()) {
    return base
  }

  // 내 등록 판본 수(array-contains)를 빼 근사 — 정확 일치
  const mine = await ApiClient.countCollection({
    collectionName: COLLECTION,
    conditions: [...conditions, ["user_ids", "array-contains", me]],
  })
  return Math.max(0, base - mine)
}

/** 펼침 시: 해당 판본의 공개 books만 조회 */
export async function fetchPublicBooksForCanonicalId(
  canonicalBookId: string,
  limitCount = 100,
): Promise<Book[]> {
  if (!canonicalBookId.trim()) return []
  return ApiClient.queryDocuments<Book>(
    "books",
    [
      ["isBookPublic", "==", true],
      ["canonicalBookId", "==", canonicalBookId],
    ],
    "created_at",
    "desc",
    limitCount,
  )
}
