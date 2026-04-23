import { ApiClient } from "@/lib/apiClient"
import {
  ReadingContentPack,
  ReadingExamAssessmentJson,
  ReadingExcerptSummaryJson,
} from "@/types/readingContent"
import { normalizeBookTitleKey } from "@/utils/bookTitleKey"
import { packDocIdFromBookTitle, titleKeyToPackDocId } from "@/utils/titleKeyDocId"

const COLLECTION = "readingContentPacks"

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
    userId: string
  ): Promise<void> {
    const titleKey = normalizeBookTitleKey(bookTitle)
    const id = titleKeyToPackDocId(titleKey)
    await ApiClient.createDocument(
      COLLECTION,
      id,
      {
        titleKey,
        bookTitleDisplay: bookTitle.trim(),
        examAssessmentData: json.assessment_data,
        createdBy: userId,
        updated_at: ApiClient.getServerTimestamp(),
      } as Record<string, unknown>,
      { merge: true }
    )
  }

  static async upsertExcerptJson(
    bookTitle: string,
    json: ReadingExcerptSummaryJson,
    userId: string
  ): Promise<void> {
    const titleKey = normalizeBookTitleKey(bookTitle)
    const id = titleKeyToPackDocId(titleKey)
    await ApiClient.createDocument(
      COLLECTION,
      id,
      {
        titleKey,
        bookTitleDisplay: bookTitle.trim(),
        excerptBookMetadata: json.book_metadata,
        excerptChapterSummaries: json.chapter_summaries,
        createdBy: userId,
        updated_at: ApiClient.getServerTimestamp(),
      } as Record<string, unknown>,
      { merge: true }
    )
  }

  static async clearExamData(bookTitle: string): Promise<void> {
    const id = titleKeyToPackDocId(normalizeBookTitleKey(bookTitle))
    await ApiClient.updateDocument<Record<string, unknown>>(COLLECTION, id, {
      examAssessmentData: undefined,
      updated_at: ApiClient.getServerTimestamp(),
    })
  }

  static async clearExcerptData(bookTitle: string): Promise<void> {
    const id = titleKeyToPackDocId(normalizeBookTitleKey(bookTitle))
    await ApiClient.updateDocument<Record<string, unknown>>(COLLECTION, id, {
      excerptBookMetadata: undefined,
      excerptChapterSummaries: undefined,
      updated_at: ApiClient.getServerTimestamp(),
    })
  }

  /** 탐색 등 제목만 있을 때 */
  static packIdFromTitle(bookTitle: string): string {
    return packDocIdFromBookTitle(bookTitle)
  }
}
