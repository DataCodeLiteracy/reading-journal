import { ApiClient } from "@/lib/apiClient"
import {
  BookQuestion,
  BookQuestionsImport,
  QuestionGroup,
} from "@/types/question"

export class QuestionService {
  /**
   * 질문 생성
   */
  static async createQuestion(
    questionData: Omit<BookQuestion, "id" | "created_at" | "updated_at">
  ): Promise<string> {
    try {
      const questionId = await ApiClient.createDocumentWithAutoId(
        "bookQuestions",
        questionData
      )
      return questionId
    } catch (error) {
      console.error("Error creating question:", error)
      throw error
    }
  }

  /**
   * 질문 조회
   */
  static async getQuestion(questionId: string): Promise<BookQuestion | null> {
    try {
      return await ApiClient.getDocument<BookQuestion>(
        "bookQuestions",
        questionId
      )
    } catch (error) {
      console.error("Error getting question:", error)
      throw error
    }
  }

  /**
   * 질문 업데이트
   */
  static async updateQuestion(
    questionId: string,
    questionData: Partial<Omit<BookQuestion, "id" | "created_at" | "updated_at">>
  ): Promise<void> {
    try {
      await ApiClient.updateDocument("bookQuestions", questionId, questionData)
    } catch (error) {
      console.error("Error updating question:", error)
      throw error
    }
  }

  /**
   * 질문 삭제
   */
  static async deleteQuestion(questionId: string): Promise<void> {
    try {
      await ApiClient.deleteDocument("bookQuestions", questionId)
    } catch (error) {
      console.error("Error deleting question:", error)
      throw error
    }
  }

  /**
   * 책의 모든 질문 조회
   * Firestore 인덱스 오류를 방지하기 위해 클라이언트 측에서 정렬
   */
  static async getBookQuestions(bookId: string): Promise<BookQuestion[]> {
    try {
      const questions = await ApiClient.queryDocuments<BookQuestion>(
        "bookQuestions",
        [["bookId", "==", bookId]]
        // order 필드로 정렬은 클라이언트 측에서 수행
      )
      // 클라이언트 측에서 order 필드로 정렬
      return questions.sort((a, b) => (a.order || 0) - (b.order || 0))
    } catch (error) {
      console.error("Error getting book questions:", error)
      throw error
    }
  }

  /**
   * 목차별 질문 조회
   * @param bookId 책 ID
   * @param chapterPath 목차 경로 (예: ["5부", "1장"])
   * @returns 해당 목차의 질문 목록
   */
  static async getQuestionsByChapter(
    bookId: string,
    chapterPath: string[]
  ): Promise<BookQuestion[]> {
    try {
      const allQuestions = await this.getBookQuestions(bookId)
      return allQuestions.filter((question) => {
        // chapterPath가 정확히 일치하는 질문만 반환
        if (question.chapterPath.length !== chapterPath.length) {
          return false
        }
        return question.chapterPath.every(
          (path, index) => path === chapterPath[index]
        )
      })
    } catch (error) {
      console.error("Error getting questions by chapter:", error)
      throw error
    }
  }

  /**
   * 질문을 목차별로 그룹화
   * @param questions 질문 목록
   * @returns 목차별로 그룹화된 질문 트리
   */
  static groupQuestionsByChapter(
    questions: BookQuestion[]
  ): QuestionGroup[] {
    const groupMap = new Map<string, QuestionGroup>()

    // 각 질문을 목차 경로에 따라 그룹화
    questions.forEach((question) => {
      const pathKey = question.chapterPath.join("/")
      const existingGroup = groupMap.get(pathKey)

      if (existingGroup) {
        existingGroup.questions.push(question)
      } else {
        groupMap.set(pathKey, {
          chapterPath: question.chapterPath,
          questions: [question],
          subGroups: [],
        })
      }
    })

    // 그룹을 계층 구조로 변환
    const groups = Array.from(groupMap.values())

    // 부모-자식 관계 설정
    const rootGroups: QuestionGroup[] = []
    const groupByDepth = new Map<number, QuestionGroup[]>()

    groups.forEach((group) => {
      const depth = group.chapterPath.length
      if (!groupByDepth.has(depth)) {
        groupByDepth.set(depth, [])
      }
      groupByDepth.get(depth)!.push(group)
    })

    // 깊이 1부터 시작하여 부모 그룹 찾기
    for (let depth = 1; depth <= 5; depth++) {
      const currentGroups = groupByDepth.get(depth) || []
      currentGroups.forEach((group) => {
        if (depth === 1) {
          rootGroups.push(group)
        } else {
          // 부모 그룹 찾기
          const parentPath = group.chapterPath.slice(0, -1)
          const parentKey = parentPath.join("/")
          const parentGroups = groupByDepth.get(depth - 1) || []
          const parentGroup = parentGroups.find(
            (g) => g.chapterPath.join("/") === parentKey
          )

          if (parentGroup) {
            if (!parentGroup.subGroups) {
              parentGroup.subGroups = []
            }
            parentGroup.subGroups.push(group)
          } else {
            // 부모가 없으면 루트로 추가
            rootGroups.push(group)
          }
        }
      })
    }

    // 각 그룹의 질문 정렬
    const sortGroup = (group: QuestionGroup): void => {
      group.questions.sort((a, b) => a.order - b.order)
      if (group.subGroups) {
        group.subGroups.forEach(sortGroup)
      }
    }

    rootGroups.forEach(sortGroup)

    return rootGroups
  }

  /**
   * JSON 형식의 질문 일괄 업로드
   * @param importData JSON 업로드 데이터
   * @param bookId 책 ID (importData에 없으면 이 값 사용)
   */
  static async importQuestions(
    importData: BookQuestionsImport,
    bookId?: string
  ): Promise<{ success: number; failed: number; errors: string[] }> {
    const targetBookId = bookId || importData.bookId
    if (!targetBookId) {
      throw new Error("bookId is required")
    }

    const errors: string[] = []
    let success = 0
    let failed = 0

    // 기존 질문 조회하여 order 계산
    const existingQuestions = await this.getBookQuestions(targetBookId)
    const maxOrder = existingQuestions.length > 0
      ? Math.max(...existingQuestions.map((q) => q.order))
      : 0

    // 각 질문 생성
    for (let i = 0; i < importData.questions.length; i++) {
      const questionData = importData.questions[i]
      try {
        // 검증
        if (!questionData.questionText || questionData.questionText.trim() === "") {
          errors.push(`질문 ${i + 1}: questionText가 비어있습니다.`)
          failed++
          continue
        }

        if (!questionData.chapterPath || questionData.chapterPath.length === 0) {
          errors.push(`질문 ${i + 1}: chapterPath가 비어있습니다.`)
          failed++
          continue
        }

        if (questionData.chapterPath.length > 5) {
          errors.push(
            `질문 ${i + 1}: chapterPath는 최대 5단계까지 가능합니다.`
          )
          failed++
          continue
        }

        // order 설정 (기존 질문의 최대 order + 1부터 시작)
        const questionToCreate: Omit<
          BookQuestion,
          "id" | "created_at" | "updated_at"
        > = {
          ...questionData,
          bookId: targetBookId,
          order: maxOrder + i + 1,
        }

        await this.createQuestion(questionToCreate)
        success++
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "알 수 없는 오류"
        errors.push(`질문 ${i + 1}: ${errorMessage}`)
        failed++
      }
    }

    return { success, failed, errors }
  }

  /**
   * 질문 검증
   * @param question 질문 데이터
   * @returns 검증 결과
   */
  static validateQuestion(
    question: Partial<BookQuestion>
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!question.questionText || question.questionText.trim() === "") {
      errors.push("questionText는 필수입니다.")
    }

    if (!question.chapterPath || question.chapterPath.length === 0) {
      errors.push("chapterPath는 필수입니다.")
    } else if (question.chapterPath.length > 5) {
      errors.push("chapterPath는 최대 5단계까지 가능합니다.")
    }

    if (!question.questionType) {
      errors.push("questionType은 필수입니다.")
    } else if (
      !["comprehension", "analysis", "synthesis", "application"].includes(
        question.questionType
      )
    ) {
      errors.push(
        "questionType은 comprehension, analysis, synthesis, application 중 하나여야 합니다."
      )
    }

    if (!question.difficulty) {
      errors.push("difficulty는 필수입니다.")
    } else if (!["easy", "medium", "hard"].includes(question.difficulty)) {
      errors.push("difficulty는 easy, medium, hard 중 하나여야 합니다.")
    }

    return {
      valid: errors.length === 0,
      errors,
    }
  }
}

