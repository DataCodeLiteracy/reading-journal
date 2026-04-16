import { ApiClient } from "@/lib/apiClient"
import type { GoldenBellUserAnswer } from "@/types/goldenBell"

const COLLECTION = "goldenBellInProgress"

export type GoldenBellSavedQuizState = "playing" | "reviewing"

export interface GoldenBellInProgressDoc {
  id: string
  userId: string
  quizId: string
  quizState: GoldenBellSavedQuizState
  currentQuestionIndex: number
  userAnswers: Record<number, string>
  results?: GoldenBellUserAnswer[]
  updated_at?: unknown
}

function docId(userId: string, quizId: string): string {
  return `${userId}__${quizId}`
}

export class GoldenBellSessionService {
  static async get(
    userId: string,
    quizId: string
  ): Promise<GoldenBellInProgressDoc | null> {
    const id = docId(userId, quizId)
    const row = await ApiClient.getDocument<GoldenBellInProgressDoc>(
      COLLECTION,
      id
    )
    if (!row) return null
    return { ...row, id }
  }

  static async save(doc: {
    userId: string
    quizId: string
    quizState: GoldenBellSavedQuizState
    currentQuestionIndex: number
    userAnswers: Record<number, string>
    results?: GoldenBellUserAnswer[]
  }): Promise<void> {
    const id = docId(doc.userId, doc.quizId)
    await ApiClient.createDocument(
      COLLECTION,
      id,
      {
        userId: doc.userId,
        quizId: doc.quizId,
        quizState: doc.quizState,
        currentQuestionIndex: doc.currentQuestionIndex,
        userAnswers: doc.userAnswers,
        ...(doc.results !== undefined ? { results: doc.results } : {}),
        updated_at: ApiClient.getServerTimestamp(),
      } as Record<string, unknown>,
      { merge: true }
    )
  }

  static async clear(userId: string, quizId: string): Promise<void> {
    const id = docId(userId, quizId)
    await ApiClient.deleteDocument(COLLECTION, id)
  }
}
