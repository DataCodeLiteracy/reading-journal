import { ApiClient } from "@/lib/apiClient"
import { QuestionAnswer } from "@/types/question"
import { StorageService } from "./storageService"

export class AnswerService {
  /**
   * 답변 생성
   */
  static async createAnswer(
    answerData: Omit<QuestionAnswer, "id" | "created_at" | "updated_at">
  ): Promise<string> {
    try {
      const answerId = await ApiClient.createDocumentWithAutoId(
        "questionAnswers",
        answerData
      )
      return answerId
    } catch (error) {
      console.error("Error creating answer:", error)
      throw error
    }
  }

  /**
   * 답변 조회
   */
  static async getAnswer(answerId: string): Promise<QuestionAnswer | null> {
    try {
      return await ApiClient.getDocument<QuestionAnswer>(
        "questionAnswers",
        answerId
      )
    } catch (error) {
      console.error("Error getting answer:", error)
      throw error
    }
  }

  /**
   * 답변 업데이트
   */
  static async updateAnswer(
    answerId: string,
    answerData: Partial<
      Omit<QuestionAnswer, "id" | "created_at" | "updated_at">
    >
  ): Promise<void> {
    try {
      await ApiClient.updateDocument("questionAnswers", answerId, answerData)
    } catch (error) {
      console.error("Error updating answer:", error)
      throw error
    }
  }

  /**
   * 답변 삭제
   */
  static async deleteAnswer(answerId: string): Promise<void> {
    try {
      const answer = await this.getAnswer(answerId)
      if (answer && answer.audioUrl) {
        // 오디오 파일이 있으면 Storage에서도 삭제
        const path = StorageService.extractPathFromURL(answer.audioUrl)
        if (path) {
          try {
            await StorageService.deleteFile(path)
          } catch (storageError) {
            console.error("Error deleting audio file from storage:", storageError)
            // Storage 삭제 실패해도 답변은 삭제 진행
          }
        }
      }

      await ApiClient.deleteDocument("questionAnswers", answerId)
    } catch (error) {
      console.error("Error deleting answer:", error)
      throw error
    }
  }

  /**
   * 질문에 대한 모든 답변 조회
   */
  static async getQuestionAnswers(
    questionId: string
  ): Promise<QuestionAnswer[]> {
    try {
      const answers = await ApiClient.queryDocuments<QuestionAnswer>(
        "questionAnswers",
        [["questionId", "==", questionId]],
        "created_at",
        "desc"
      )
      return answers
    } catch (error) {
      console.error("Error getting question answers:", error)
      throw error
    }
  }

  /**
   * 사용자의 모든 답변 조회
   */
  static async getUserAnswers(user_id: string): Promise<QuestionAnswer[]> {
    try {
      const answers = await ApiClient.queryDocuments<QuestionAnswer>(
        "questionAnswers",
        [["user_id", "==", user_id]],
        "created_at",
        "desc"
      )
      return answers
    } catch (error) {
      console.error("Error getting user answers:", error)
      throw error
    }
  }

  /**
   * 책의 모든 답변 조회
   */
  static async getBookAnswers(bookId: string): Promise<QuestionAnswer[]> {
    try {
      const answers = await ApiClient.queryDocuments<QuestionAnswer>(
        "questionAnswers",
        [["bookId", "==", bookId]],
        "created_at",
        "desc"
      )
      return answers
    } catch (error) {
      console.error("Error getting book answers:", error)
      throw error
    }
  }

  /**
   * 텍스트 답변 생성
   */
  static async createTextAnswer(
    questionId: string,
    bookId: string,
    user_id: string,
    answerText: string
  ): Promise<string> {
    try {
      const answerData: Omit<
        QuestionAnswer,
        "id" | "created_at" | "updated_at"
      > = {
        questionId,
        bookId,
        user_id,
        answerText,
      }

      return await this.createAnswer(answerData)
    } catch (error) {
      console.error("Error creating text answer:", error)
      throw error
    }
  }

  /**
   * 오디오 답변 생성
   * @param questionId 질문 ID
   * @param bookId 책 ID
   * @param user_id 사용자 ID
   * @param audioBlob 오디오 파일 (Blob)
   * @param audioTranscript STT로 변환된 텍스트 (선택)
   * @returns 답변 ID
   */
  static async createAudioAnswer(
    questionId: string,
    bookId: string,
    user_id: string,
    audioBlob: Blob,
    audioTranscript?: string
  ): Promise<string> {
    try {
      // 오디오 파일 업로드
      const timestamp = Date.now()
      const audioPath = StorageService.generateAnswerAudioPath(
        user_id,
        questionId,
        timestamp
      )
      const audioUrl = await StorageService.uploadAudioFile(audioBlob, audioPath)

      // 답변 데이터 생성
      const answerData: Omit<
        QuestionAnswer,
        "id" | "created_at" | "updated_at"
      > = {
        questionId,
        bookId,
        user_id,
        audioUrl,
        audioTranscript,
      }

      return await this.createAnswer(answerData)
    } catch (error) {
      console.error("Error creating audio answer:", error)
      throw error
    }
  }

  /**
   * 텍스트와 오디오 모두 포함한 답변 생성
   */
  static async createMixedAnswer(
    questionId: string,
    bookId: string,
    user_id: string,
    answerText: string,
    audioBlob?: Blob,
    audioTranscript?: string
  ): Promise<string> {
    try {
      let audioUrl: string | undefined

      // 오디오 파일이 있으면 업로드
      if (audioBlob) {
        const timestamp = Date.now()
        const audioPath = StorageService.generateAnswerAudioPath(
          user_id,
          questionId,
          timestamp
        )
        audioUrl = await StorageService.uploadAudioFile(audioBlob, audioPath)
      }

      // 답변 데이터 생성
      const answerData: Omit<
        QuestionAnswer,
        "id" | "created_at" | "updated_at"
      > = {
        questionId,
        bookId,
        user_id,
        answerText,
        audioUrl,
        audioTranscript,
      }

      return await this.createAnswer(answerData)
    } catch (error) {
      console.error("Error creating mixed answer:", error)
      throw error
    }
  }
}

