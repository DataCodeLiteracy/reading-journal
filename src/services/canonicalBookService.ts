import { arrayUnion } from "firebase/firestore"
import { ApiClient } from "@/lib/apiClient"
import type { Book } from "@/types/book"
import type { CanonicalBook } from "@/types/canonicalBook"
import type { BookTocEntry } from "@/types/bookToc"
import {
  editionKeyFromBook,
  primaryCanonicalDocId,
} from "@/utils/editionKeyDocId"

const COLLECTION = "canonicalBooks"

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
    }
    await ApiClient.createDocument(COLLECTION, id, payload)
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
    }
    const id = await ApiClient.createDocumentWithAutoId(COLLECTION, payload)
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
    await ApiClient.updateDocument(COLLECTION, canonicalId, {
      ...patch,
      user_ids: arrayUnion(userId),
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
}
