import { ApiClient } from "@/lib/apiClient"
import type { Book } from "@/types/book"
import {
  ReadingContentPack,
  ReadingExamAssessmentJson,
  ReadingExcerptSummaryJson,
} from "@/types/readingContent"
import { normalizeBookTitleKey } from "@/utils/bookTitleKey"
import { editionKeyFromBook } from "@/utils/editionKeyDocId"
import { packDocIdFromBookTitle, titleKeyToPackDocId } from "@/utils/titleKeyDocId"

const COLLECTION = "readingContentPacks"

export type ReadingContentBookRef = Pick<
  Book,
  "title" | "publisher" | "canonicalBookId" | "editionKey"
>

export type ReadingContentPackWriteOptions = {
  canonicalBookId?: string
  editionKey?: string
  publisher?: string
}

function resolvePackDocId(
  bookTitle: string,
  options?: ReadingContentPackWriteOptions,
): string {
  if (options?.canonicalBookId) return options.canonicalBookId
  return titleKeyToPackDocId(normalizeBookTitleKey(bookTitle))
}

function buildPackMeta(
  bookTitle: string,
  options?: ReadingContentPackWriteOptions,
): Pick<ReadingContentPack, "titleKey" | "bookTitleDisplay" | "editionKey" | "canonicalBookId"> {
  const titleKey = normalizeBookTitleKey(bookTitle)
  return {
    titleKey,
    bookTitleDisplay: bookTitle.trim(),
    ...(options?.canonicalBookId
      ? { canonicalBookId: options.canonicalBookId }
      : {}),
    ...(options?.editionKey
      ? { editionKey: options.editionKey }
      : options?.publisher || options?.canonicalBookId
        ? { editionKey: editionKeyFromBook(bookTitle, options.publisher) }
        : {}),
  }
}

export class ReadingContentPackService {
  static validateExamJson(data: unknown): data is ReadingExamAssessmentJson {
    if (!data || typeof data !== "object") return false
    const o = data as Record<string, unknown>
    if (!Array.isArray(o.assessment_data)) return false
    for (const block of o.assessment_data) {
      if (!block || typeof block !== "object") return false
      const b = block as Record<string, unknown>
      if (typeof b.range !== "string" || !Array.isArray(b.quizzes)) return false
      for (const q of b.quizzes) {
        if (!q || typeof q !== "object") return false
        const qq = q as Record<string, unknown>
        if (typeof qq.question_number !== "number") return false
        if (typeof qq.question !== "string" || typeof qq.answer_key !== "string")
          return false
        if (!Array.isArray(qq.scoring_focus)) return false
      }
    }
    return true
  }

  static validateExcerptJson(data: unknown): data is ReadingExcerptSummaryJson {
    if (!data || typeof data !== "object") return false
    const o = data as Record<string, unknown>
    if (!o.book_metadata || typeof o.book_metadata !== "object") return false
    const m = o.book_metadata as Record<string, unknown>
    if (typeof m.title !== "string" || typeof m.overall_summary !== "string")
      return false
    if (typeof m.total_pages !== "number") return false
    if (!Array.isArray(o.chapter_summaries)) return false
    for (const ch of o.chapter_summaries) {
      if (!ch || typeof ch !== "object") return false
      const c = ch as Record<string, unknown>
      if (typeof c.title !== "string" || typeof c.summary !== "string")
        return false
      if (!Array.isArray(c.key_keywords)) return false
    }
    return true
  }

  /** canonicalBookId 우선, 없으면 제목 키(레거시) */
  static async getForBook(
    book: ReadingContentBookRef,
  ): Promise<ReadingContentPack | null> {
    if (book.canonicalBookId) {
      const byCanon = await ApiClient.getDocument<ReadingContentPack>(
        COLLECTION,
        book.canonicalBookId,
      )
      if (byCanon) return { ...byCanon, id: book.canonicalBookId }
    }
    return this.getByBookTitle(book.title)
  }

  static async getByCanonicalBookId(
    canonicalBookId: string,
  ): Promise<ReadingContentPack | null> {
    const doc = await ApiClient.getDocument<ReadingContentPack>(
      COLLECTION,
      canonicalBookId,
    )
    if (!doc) return null
    return { ...doc, id: canonicalBookId }
  }

  static async getByBookTitle(bookTitle: string): Promise<ReadingContentPack | null> {
    const titleKey = normalizeBookTitleKey(bookTitle)
    const id = titleKeyToPackDocId(titleKey)
    const doc = await ApiClient.getDocument<ReadingContentPack>(COLLECTION, id)
    if (!doc) return null
    return { ...doc, id }
  }

  static async upsertExamJson(
    bookTitle: string,
    json: ReadingExamAssessmentJson,
    userId: string,
    options?: ReadingContentPackWriteOptions,
  ): Promise<void> {
    const id = resolvePackDocId(bookTitle, options)
    await ApiClient.createDocument(
      COLLECTION,
      id,
      {
        ...buildPackMeta(bookTitle, options),
        examAssessmentData: json.assessment_data,
        createdBy: userId,
        updated_at: ApiClient.getServerTimestamp(),
      } as Record<string, unknown>,
      { merge: true },
    )
  }

  static async upsertExcerptJson(
    bookTitle: string,
    json: ReadingExcerptSummaryJson,
    userId: string,
    options?: ReadingContentPackWriteOptions,
  ): Promise<void> {
    const id = resolvePackDocId(bookTitle, options)
    await ApiClient.createDocument(
      COLLECTION,
      id,
      {
        ...buildPackMeta(bookTitle, options),
        excerptBookMetadata: json.book_metadata,
        excerptChapterSummaries: json.chapter_summaries,
        createdBy: userId,
        updated_at: ApiClient.getServerTimestamp(),
      } as Record<string, unknown>,
      { merge: true },
    )
  }

  static async clearExamData(
    bookTitle: string,
    options?: ReadingContentPackWriteOptions,
  ): Promise<void> {
    const id = resolvePackDocId(bookTitle, options)
    await ApiClient.updateDocument<Record<string, unknown>>(COLLECTION, id, {
      examAssessmentData: undefined,
      updated_at: ApiClient.getServerTimestamp(),
    })
  }

  static async clearExcerptData(
    bookTitle: string,
    options?: ReadingContentPackWriteOptions,
  ): Promise<void> {
    const id = resolvePackDocId(bookTitle, options)
    await ApiClient.updateDocument<Record<string, unknown>>(COLLECTION, id, {
      excerptBookMetadata: undefined,
      excerptChapterSummaries: undefined,
      updated_at: ApiClient.getServerTimestamp(),
    })
  }

  static async clearExamDataForBook(book: ReadingContentBookRef): Promise<void> {
    await this.clearExamData(book.title, {
      canonicalBookId: book.canonicalBookId,
      editionKey: book.editionKey,
      publisher: book.publisher,
    })
  }

  static async clearExcerptDataForBook(
    book: ReadingContentBookRef,
  ): Promise<void> {
    await this.clearExcerptData(book.title, {
      canonicalBookId: book.canonicalBookId,
      editionKey: book.editionKey,
      publisher: book.publisher,
    })
  }

  static packWriteOptionsFromBook(
    book: ReadingContentBookRef,
  ): ReadingContentPackWriteOptions {
    return {
      canonicalBookId: book.canonicalBookId,
      editionKey: book.editionKey,
      publisher: book.publisher,
    }
  }

  /** 탐색 등 제목만 있을 때 */
  static packIdFromTitle(bookTitle: string): string {
    return packDocIdFromBookTitle(bookTitle)
  }
}
