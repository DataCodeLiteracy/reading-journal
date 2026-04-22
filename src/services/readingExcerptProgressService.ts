import { ApiClient } from "@/lib/apiClient"
import {
  ReadingExcerptChapterResult,
  ReadingExcerptProgress,
} from "@/types/readingContent"

const COLLECTION = "readingExcerptProgress"

function docId(userId: string, bookId: string): string {
  return `${userId}__${bookId}`
}

export class ReadingExcerptProgressService {
  static async get(
    userId: string,
    bookId: string
  ): Promise<ReadingExcerptProgress | null> {
    const id = docId(userId, bookId)
    const row = await ApiClient.getDocument<ReadingExcerptProgress>(
      COLLECTION,
      id
    )
    if (!row) return null
    return { ...row, id }
  }

  static async upsert(
    userId: string,
    bookId: string,
    titleKey: string,
    partial: Partial<
      Pick<
        ReadingExcerptProgress,
        | "currentChapterIndex"
        | "chapters"
        | "overallSummaryUserText"
        | "coreMessages"
      >
    >
  ): Promise<void> {
    const id = docId(userId, bookId)
    const existing = await this.get(userId, bookId)
    const payload: Record<string, unknown> = {
      userId,
      bookId,
      titleKey,
      currentChapterIndex:
        partial.currentChapterIndex ?? existing?.currentChapterIndex ?? 0,
      chapters: {
        ...(existing?.chapters ?? {}),
        ...(partial.chapters ?? {}),
      } as Record<number, ReadingExcerptChapterResult>,
      updated_at: ApiClient.getServerTimestamp(),
    }
    if (partial.overallSummaryUserText !== undefined) {
      payload.overallSummaryUserText = partial.overallSummaryUserText
    }
    if (partial.coreMessages !== undefined) {
      payload.coreMessages = partial.coreMessages
    }
    await ApiClient.createDocument(
      COLLECTION,
      id,
      payload as Record<string, unknown>,
      { merge: true }
    )
  }
}
