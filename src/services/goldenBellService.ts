import { ApiClient } from "@/lib/apiClient"
import type { Book } from "@/types/book"
import {
  GoldenBellQuiz,
  GoldenBellJsonData,
  GoldenBellQuizSummary,
  GoldenBellDifficulty,
  GoldenBellResult,
  GoldenBellUserAnswer,
  GoldenBellResultSummary,
} from "@/types/goldenBell"

export class GoldenBellService {
  private static readonly COLLECTION = "goldenBellQuizzes"

  /**
   * canonicalBookId 우선, 없으면 제목(레거시)
   */
  static async getQuizzesForBook(
    book: Pick<Book, "title" | "canonicalBookId">,
  ): Promise<GoldenBellQuiz[]> {
    if (book.canonicalBookId) {
      const byCanon = await ApiClient.queryDocuments<GoldenBellQuiz>(
        this.COLLECTION,
        [["canonicalBookId", "==", book.canonicalBookId]],
      )
      if (byCanon.length > 0) return byCanon
    }
    return this.getQuizzesByBookTitle(book.title)
  }

  static async getQuizSummariesForBook(
    book: Pick<Book, "title" | "canonicalBookId">,
  ): Promise<GoldenBellQuizSummary[]> {
    const quizzes = await this.getQuizzesForBook(book)
    return quizzes.map((quiz) => this.toSummary(quiz))
  }

  /**
   * 책 제목으로 골든벨 퀴즈 목록 조회 (레거시)
   */
  static async getQuizzesByBookTitle(
    bookTitle: string
  ): Promise<GoldenBellQuiz[]> {
    const normalizedTitle = bookTitle.trim()
    return await ApiClient.queryDocuments<GoldenBellQuiz>(this.COLLECTION, [
      ["bookTitle", "==", normalizedTitle],
    ])
  }

  /**
   * 책 제목으로 골든벨 퀴즈 요약 정보 조회
   */
  static async getQuizSummariesByBookTitle(
    bookTitle: string
  ): Promise<GoldenBellQuizSummary[]> {
    const quizzes = await this.getQuizzesByBookTitle(bookTitle)
    return quizzes.map((quiz) => this.toSummary(quiz))
  }

  /**
   * 퀴즈 ID로 단일 퀴즈 조회
   */
  static async getQuizById(quizId: string): Promise<GoldenBellQuiz | null> {
    return await ApiClient.getDocument<GoldenBellQuiz>(this.COLLECTION, quizId)
  }

  /**
   * JSON 데이터로 새 골든벨 퀴즈 생성
   */
  static async createQuizFromJson(
    bookTitle: string,
    jsonData: GoldenBellJsonData,
    userId: string,
    difficulty: GoldenBellDifficulty,
    canonicalBookId?: string,
  ): Promise<string> {
    const normalizedTitle = bookTitle.trim()
    const difficultyLabel = difficulty === "easy" ? "쉬운 버전" : "어려운 버전"
    const normalizedData = this.normalizeJsonData(jsonData)

    const quizData: Omit<GoldenBellQuiz, "id"> = {
      bookTitle: normalizedTitle,
      ...(canonicalBookId ? { canonicalBookId } : {}),
      version: difficultyLabel,
      difficulty,
      questions: normalizedData.questions,
      answers: normalizedData.answers,
      createdBy: userId,
    }

    const quizId = await ApiClient.createDocumentWithAutoId(
      this.COLLECTION,
      quizData
    )
    return quizId
  }

  /**
   * 기존 퀴즈 업데이트
   */
  static async updateQuiz(
    quizId: string,
    jsonData: GoldenBellJsonData,
    difficulty: GoldenBellDifficulty
  ): Promise<void> {
    const difficultyLabel = difficulty === "easy" ? "쉬운 버전" : "어려운 버전"
    const normalizedData = this.normalizeJsonData(jsonData)

    await ApiClient.updateDocument(this.COLLECTION, quizId, {
      version: difficultyLabel,
      difficulty,
      questions: normalizedData.questions,
      answers: normalizedData.answers,
    })
  }

  /**
   * 특정 책+난이도로 기존 퀴즈가 있는지 확인
   */
  static async findExistingQuiz(
    bookTitle: string,
    difficulty: GoldenBellDifficulty,
    canonicalBookId?: string,
  ): Promise<GoldenBellQuiz | null> {
    if (canonicalBookId) {
      const byCanon = await ApiClient.queryDocuments<GoldenBellQuiz>(
        this.COLLECTION,
        [
          ["canonicalBookId", "==", canonicalBookId],
          ["difficulty", "==", difficulty],
        ],
      )
      if (byCanon.length > 0) return byCanon[0]
    }

    const normalizedTitle = bookTitle.trim()
    const quizzes = await ApiClient.queryDocuments<GoldenBellQuiz>(this.COLLECTION, [
      ["bookTitle", "==", normalizedTitle],
      ["difficulty", "==", difficulty],
    ])
    return quizzes.length > 0 ? quizzes[0] : null
  }

  /**
   * 골든벨 퀴즈 삭제
   */
  static async deleteQuiz(quizId: string): Promise<void> {
    await ApiClient.deleteDocument(this.COLLECTION, quizId)
  }

  /**
   * 퀴즈를 요약 정보로 변환
   */
  private static toSummary(quiz: GoldenBellQuiz): GoldenBellQuizSummary {
    const multipleChoiceCount = quiz.questions.filter(
      (q) => q.type === "객관식"
    ).length
    const shortAnswerCount = quiz.questions.filter(
      (q) => q.type === "단답형"
    ).length
    const essayCount = quiz.questions.filter((q) => q.type === "서술형").length

    return {
      id: quiz.id,
      version: quiz.version,
      difficulty: quiz.difficulty || "easy",
      totalQuestions: quiz.questions.length,
      multipleChoiceCount,
      shortAnswerCount,
      essayCount,
    }
  }

  /**
   * 문제 타입 정규화 (영어 -> 한글)
   */
  private static normalizeQuestionType(type: string): string {
    const typeMap: Record<string, string> = {
      "multiple_choice": "객관식",
      "short_answer": "단답형",
      "essay": "서술형",
      "객관식": "객관식",
      "단답형": "단답형",
      "서술형": "서술형",
    }
    return typeMap[type] || type
  }

  /**
   * JSON 데이터 유효성 검사
   */
  static validateJsonData(data: unknown): data is GoldenBellJsonData {
    if (!data || typeof data !== "object") return false

    const json = data as Record<string, unknown>

    // document_info 검사
    if (
      !json.document_info ||
      typeof json.document_info !== "object" ||
      typeof (json.document_info as Record<string, unknown>).title !== "string"
    ) {
      return false
    }

    // questions 검사
    if (!Array.isArray(json.questions) || json.questions.length === 0) {
      return false
    }

    const validTypes = ["객관식", "단답형", "서술형", "multiple_choice", "short_answer", "essay"]

    for (const q of json.questions) {
      if (
        typeof q.id !== "number" ||
        typeof q.type !== "string" ||
        !validTypes.includes(q.type) ||
        typeof q.question !== "string"
      ) {
        return false
      }
      // 객관식만 options 필수
      const normalizedType = this.normalizeQuestionType(q.type)
      if (normalizedType === "객관식" && (!Array.isArray(q.options) || q.options.length === 0)) {
        return false
      }
    }

    // answers 검사
    if (!Array.isArray(json.answers) || json.questions.length !== json.answers.length) {
      return false
    }

    for (const a of json.answers) {
      if (
        typeof a.id !== "number" ||
        typeof a.answer !== "string"
      ) {
        return false
      }
    }

    return true
  }

  /**
   * JSON 데이터 정규화 (영어 타입 -> 한글, options 보장)
   */
  static normalizeJsonData(data: GoldenBellJsonData): GoldenBellJsonData {
    return {
      ...data,
      questions: data.questions.map((q) => ({
        ...q,
        type: this.normalizeQuestionType(q.type) as "객관식" | "단답형" | "서술형",
        options: q.options || [],
      })),
      answers: data.answers.map((a) => ({
        ...a,
        explanation: a.explanation || "",
      })),
    }
  }

  // ========== 결과 관련 메서드 ==========
  private static readonly RESULTS_COLLECTION = "goldenBellResults"

  /**
   * 골든벨 결과 저장
   */
  static async saveResult(
    quizId: string,
    bookTitle: string,
    difficulty: GoldenBellDifficulty,
    userId: string,
    answers: GoldenBellUserAnswer[],
    totalQuestions: number
  ): Promise<string> {
    const correctCount = answers.filter((a) => a.isCorrect).length
    const score = Math.round((correctCount / totalQuestions) * 100)

    const resultData: Omit<GoldenBellResult, "id"> = {
      quizId,
      bookTitle,
      difficulty,
      userId,
      totalQuestions,
      correctCount,
      score,
      answers,
      completedAt: new Date(),
    }

    const resultId = await ApiClient.createDocumentWithAutoId(
      this.RESULTS_COLLECTION,
      resultData
    )
    return resultId
  }

  /**
   * 특정 결과 조회
   */
  static async getResult(resultId: string): Promise<GoldenBellResult | null> {
    return await ApiClient.getDocument<GoldenBellResult>(
      this.RESULTS_COLLECTION,
      resultId
    )
  }

  /**
   * 사용자의 모든 결과 조회
   */
  static async getUserResults(userId: string): Promise<GoldenBellResult[]> {
    return await ApiClient.queryDocuments<GoldenBellResult>(
      this.RESULTS_COLLECTION,
      [["userId", "==", userId]]
    )
  }

  /**
   * 사용자의 결과 요약 목록 조회
   */
  static async getUserResultSummaries(
    userId: string
  ): Promise<GoldenBellResultSummary[]> {
    const results = await this.getUserResults(userId)
    return results
      .map((r) => ({
        id: r.id,
        quizId: r.quizId,
        bookTitle: r.bookTitle,
        difficulty: r.difficulty,
        totalQuestions: r.totalQuestions,
        correctCount: r.correctCount,
        score: r.score,
        completedAt: r.completedAt,
      }))
      .sort((a, b) => {
        const dateA = a.completedAt instanceof Date ? a.completedAt : new Date(a.completedAt)
        const dateB = b.completedAt instanceof Date ? b.completedAt : new Date(b.completedAt)
        return dateB.getTime() - dateA.getTime()
      })
  }

  /**
   * 특정 책의 사용자 결과 조회
   */
  static async getUserResultsByBook(
    userId: string,
    bookTitle: string
  ): Promise<GoldenBellResult[]> {
    const results = await this.getUserResults(userId)
    return results
      .filter((r) => r.bookTitle === bookTitle)
      .sort((a, b) => {
        const dateA = a.completedAt instanceof Date ? a.completedAt : new Date(a.completedAt)
        const dateB = b.completedAt instanceof Date ? b.completedAt : new Date(b.completedAt)
        return dateB.getTime() - dateA.getTime()
      })
  }
}
