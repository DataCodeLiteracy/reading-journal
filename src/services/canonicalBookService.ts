import { arrayUnion } from "firebase/firestore"
import { ApiClient } from "@/lib/apiClient"
import type { Book } from "@/types/book"
import type { CanonicalBook } from "@/types/canonicalBook"
import type { BookTocEntry } from "@/types/bookToc"
import { normalizeBookTitleKey } from "@/utils/bookTitleKey"
import {
  editionKeyFromBook,
  primaryCanonicalDocId,
} from "@/utils/editionKeyDocId"

const COLLECTION = "canonicalBooks"
const CATALOG_CACHE_TTL_MS = 60_000

let catalogCache: CanonicalBook[] | null = null
let catalogCacheAt = 0

function matchScore(titleKey: string, authorKey: string, queryKey: string) {
  if (titleKey.startsWith(queryKey)) return 0
  if (titleKey.includes(queryKey)) return 1
  if (authorKey.includes(queryKey)) return 2
  return 99
}

function pickSharedBibliographic(
  source: Pick<
    Book,
    | "title"
    | "author"
    | "publisher"
    | "publishedDate"
    | "isbn13"
    | "coverUrl"
    | "categoryDepth1Id"
    | "categoryDepth1Label"
    | "categoryDepth2Id"
    | "categoryDepth2Label"
    | "level"
    | "tocOutline"
  >,
): Omit<
  CanonicalBook,
  "id" | "editionKey" | "user_ids" | "created_at" | "updated_at"
> {
  return {
    title: source.title.trim(),
    ...(source.author?.trim() ? { author: source.author.trim() } : {}),
    ...(source.publisher?.trim() ? { publisher: source.publisher.trim() } : {}),
    ...(source.publishedDate?.trim()
      ? { publishedDate: source.publishedDate.trim() }
      : {}),
    ...(source.isbn13?.trim() ? { isbn13: source.isbn13.trim() } : {}),
    ...(source.coverUrl?.trim() ? { coverUrl: source.coverUrl.trim() } : {}),
    ...(source.categoryDepth1Id
      ? {
          categoryDepth1Id: source.categoryDepth1Id,
          categoryDepth1Label: source.categoryDepth1Label,
        }
      : {}),
    ...(source.categoryDepth2Id
      ? {
          categoryDepth2Id: source.categoryDepth2Id,
          categoryDepth2Label: source.categoryDepth2Label,
        }
      : {}),
    ...(source.level ? { level: source.level } : {}),
    ...(source.tocOutline?.length ? { tocOutline: source.tocOutline } : {}),
  }
}

function mergeSharedFields(
  existing: CanonicalBook,
  incoming: ReturnType<typeof pickSharedBibliographic>,
): Partial<CanonicalBook> {
  const patch: Partial<CanonicalBook> = {}
  if (!existing.author && incoming.author) patch.author = incoming.author
  if (!existing.publisher && incoming.publisher)
    patch.publisher = incoming.publisher
  if (!existing.publishedDate && incoming.publishedDate)
    patch.publishedDate = incoming.publishedDate
  if (!existing.isbn13 && incoming.isbn13) patch.isbn13 = incoming.isbn13
  if (!existing.coverUrl && incoming.coverUrl) patch.coverUrl = incoming.coverUrl
  if (!existing.categoryDepth1Id && incoming.categoryDepth1Id) {
    patch.categoryDepth1Id = incoming.categoryDepth1Id
    patch.categoryDepth1Label = incoming.categoryDepth1Label
  }
  if (!existing.categoryDepth2Id && incoming.categoryDepth2Id) {
    patch.categoryDepth2Id = incoming.categoryDepth2Id
    patch.categoryDepth2Label = incoming.categoryDepth2Label
  }
  if (!existing.level && incoming.level) patch.level = incoming.level
  if (
    (!existing.tocOutline || existing.tocOutline.length === 0) &&
    incoming.tocOutline?.length
  ) {
    patch.tocOutline = incoming.tocOutline
  }
  return patch
}

export class CanonicalBookService {
  static async getById(id: string): Promise<CanonicalBook | null> {
    return ApiClient.getDocument<CanonicalBook>(COLLECTION, id)
  }

  /**
   * 공유 판본 제목·저자 부분 일치 검색입니다.
   * 제목 앞부분뿐 아니라 중간 키워드(예: "몽몽")도 찾을 수 있습니다.
   * 빈 검색어로 컬렉션을 훑지 않으며, 최대 20건만 반환합니다.
   */
  static async searchByTitlePrefix(
    query: string,
    limit = 20,
  ): Promise<CanonicalBook[]> {
    const queryKey = normalizeBookTitleKey(query)
    if (!queryKey) return []

    const safeLimit = Math.min(20, Math.max(1, Math.floor(limit)))
    const now = Date.now()
    if (!catalogCache || now - catalogCacheAt > CATALOG_CACHE_TTL_MS) {
      catalogCache = await ApiClient.queryDocuments<CanonicalBook>(
        COLLECTION,
        [],
        "title",
        "asc",
      )
      catalogCacheAt = now
    }

    return catalogCache
      .map((book) => {
        const titleKey = normalizeBookTitleKey(book.title)
        const authorKey = normalizeBookTitleKey(book.author ?? "")
        const score = matchScore(titleKey, authorKey, queryKey)
        if (score >= 99) return null
        return { book, score, titleKey }
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .sort(
        (left, right) =>
          left.score - right.score ||
          left.titleKey.localeCompare(right.titleKey, "ko"),
      )
      .slice(0, safeLimit)
      .map((item) => item.book)
  }

  /** 새 공유 판본이 생긴 뒤 검색 캐시를 비웁니다. */
  static invalidateSearchCache() {
    catalogCache = null
    catalogCacheAt = 0
  }

  static async findPrimaryByEdition(
    title: string,
    publisher?: string,
  ): Promise<CanonicalBook | null> {
    const id = primaryCanonicalDocId(title, publisher)
    return this.getById(id)
  }

  static async createPrimaryWithUser(
    userId: string,
    book: Omit<Book, "id">,
  ): Promise<CanonicalBook> {
    const editionKey = editionKeyFromBook(book.title, book.publisher)
    const id = primaryCanonicalDocId(book.title, book.publisher)
    const payload: Omit<CanonicalBook, "id" | "created_at" | "updated_at"> = {
      editionKey,
      ...pickSharedBibliographic(book),
      user_ids: [userId],
      registrantCount: 1,
    }
    await ApiClient.createDocument(COLLECTION, id, payload)
    this.invalidateSearchCache()
    const created = await this.getById(id)
    if (!created) throw new Error("공유 도서를 만들지 못했습니다.")
    return created
  }

  /** 레거시 books 판본 묶음으로 primary canonical 생성·books에 canonicalBookId 백필 */
  static async createPrimaryFromExistingBooks(
    books: readonly Book[],
    title: string,
    publisher?: string,
  ): Promise<CanonicalBook> {
    if (books.length === 0) {
      throw new Error("백필할 책이 없습니다.")
    }

    const editionKey = editionKeyFromBook(title, publisher)
    const id = primaryCanonicalDocId(title, publisher)
    const seed =
      books.find((b) => (b.tocOutline?.length ?? 0) > 0) ?? books[0]
    const tocOutline = books.find((b) => b.tocOutline?.length)?.tocOutline
    const userIds = [...new Set(books.map((b) => b.user_id))]

    const payload: Omit<CanonicalBook, "id" | "created_at" | "updated_at"> = {
      editionKey,
      ...pickSharedBibliographic(seed),
      user_ids: userIds,
      registrantCount: userIds.length,
      ...(tocOutline?.length ? { tocOutline } : {}),
    }
    await ApiClient.createDocument(COLLECTION, id, payload)

    await Promise.all(
      books.map((b) =>
        ApiClient.updateDocument("books", b.id, {
          canonicalBookId: id,
          editionKey,
        }),
      ),
    )

    this.invalidateSearchCache()
    const created = await this.getById(id)
    if (!created) throw new Error("공유 도서를 만들지 못했습니다.")
    return created
  }

  static async createSeparateWithUser(
    userId: string,
    book: Omit<Book, "id">,
  ): Promise<CanonicalBook> {
    const editionKey = editionKeyFromBook(book.title, book.publisher)
    const payload: Omit<CanonicalBook, "id" | "created_at" | "updated_at"> = {
      editionKey,
      ...pickSharedBibliographic(book),
      user_ids: [userId],
      registrantCount: 1,
    }
    const id = await ApiClient.createDocumentWithAutoId(COLLECTION, payload)
    this.invalidateSearchCache()
    const created = await this.getById(id)
    if (!created) throw new Error("공유 도서를 만들지 못했습니다.")
    return created
  }

  static async linkUser(
    canonicalId: string,
    userId: string,
    book: Omit<Book, "id">,
  ): Promise<CanonicalBook> {
    const existing = await this.getById(canonicalId)
    if (!existing) throw new Error("공유 도서를 찾을 수 없습니다.")

    const patch = mergeSharedFields(
      existing,
      pickSharedBibliographic(book),
    )
    const already = existing.user_ids.includes(userId)
    const nextCount = already
      ? (existing.registrantCount ?? existing.user_ids.length)
      : (existing.registrantCount ?? existing.user_ids.length) + 1
    await ApiClient.updateDocument(COLLECTION, canonicalId, {
      ...patch,
      user_ids: arrayUnion(userId),
      registrantCount: nextCount,
    })

    const updated = await this.getById(canonicalId)
    if (!updated) throw new Error("공유 도서를 불러오지 못했습니다.")
    return updated
  }

  static async updateTocOutline(
    canonicalId: string,
    tocOutline: BookTocEntry[] | undefined,
  ): Promise<void> {
    await ApiClient.updateDocument(COLLECTION, canonicalId, {
      tocOutline: tocOutline?.length ? tocOutline : undefined,
    })
  }

  /** canonical id → 목차 항목 (없으면 빈 배열) */
  static async getTocOutlinesByIds(
    ids: string[],
  ): Promise<Record<string, BookTocEntry[]>> {
    const unique = [...new Set(ids.filter(Boolean))]
    const pairs = await Promise.all(
      unique.map(async (id) => {
        const book = await this.getById(id)
        return [id, book?.tocOutline?.length ? book.tocOutline : []] as const
      }),
    )
    return Object.fromEntries(pairs)
  }
}
