import { ApiClient } from "@/lib/apiClient"
import {
  ReadingExamProgress,
  ReadingExamQuestionGrade,
} from "@/types/readingContent"

const COLLECTION = "readingExamProgress"

function docId(userId: string, bookId: string): string {
  return `${userId}__${bookId}`
}

export class ReadingExamProgressService {
  static async get(
    userId: string,
    bookId: string
  ): Promise<ReadingExamProgress | null> {
    const id = docId(userId, bookId)
    const row = await ApiClient.getDocument<ReadingExamProgress>(COLLECTION, id)
    if (!row) return null
    return { ...row, id }
  }

  static async upsert(
    userId: string,
    bookId: string,
    titleKey: string,
    partial: Partial<
      Pick<
        ReadingExamProgress,
        | "currentRangeIndex"
        | "currentQuizIndex"
        | "draftAnswers"
        | "grades"
      >
    >
  ): Promise<void> {
    const id = docId(userId, bookId)
    const existing = await this.get(userId, bookId)
    await ApiClient.createDocument(
      COLLECTION,
      id,
      {
        userId,
        bookId,
        titleKey,
        currentRangeIndex: partial.currentRangeIndex ?? existing?.currentRangeIndex ?? 0,
        currentQuizIndex: partial.currentQuizIndex ?? existing?.currentQuizIndex ?? 0,
        draftAnswers: {
          ...(existing?.draftAnswers ?? {}),
          ...(partial.draftAnswers ?? {}),
        },
        grades: {
          ...(existing?.grades ?? {}),
          ...(partial.grades ?? {}),
        },
        updated_at: ApiClient.getServerTimestamp(),
      } as Record<string, unknown>,
      { merge: true }
    )
  }

  static async setGrade(
    userId: string,
    bookId: string,
    titleKey: string,
    questionNumber: number,
    grade: ReadingExamQuestionGrade
  ): Promise<void> {
    const existing = await this.get(userId, bookId)
    const grades = { ...(existing?.grades ?? {}), [questionNumber]: grade }
    await this.upsert(userId, bookId, titleKey, { grades })
  }
}
