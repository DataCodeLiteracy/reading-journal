import { AppDate } from "./firebase"

export type QuestionType = "comprehension" | "analysis" | "synthesis" | "application"
export type Difficulty = "easy" | "medium" | "hard"

/**
 * 책의 질문 정보
 * chapterPath는 최대 5단계 깊이까지 지원: ["5부", "1장", "1절", "1항", "1목"]
 */
export interface BookQuestion {
  id: string
  bookId: string
  user_id?: string // 질문 작성자 ID (공개 질문의 경우 필요)
  questionText: string
  chapterPath: string[] // 최대 5단계 깊이: ["5부", "1장", "1절", "1항", "1목"]
  questionType: QuestionType
  difficulty: Difficulty
  order: number // 같은 목차 내 정렬 순서
  isPublic?: boolean // 공개 여부 (기본값: false)
  likesCount?: number // 좋아요 수 (캐시된 값)
  commentsCount?: number // 댓글 수 (캐시된 값)
  created_at?: Date
  updated_at?: Date
}

/**
 * 질문에 대한 답변
 * 텍스트 또는 오디오로 답변 가능
 */
export interface QuestionAnswer {
  id: string
  questionId: string
  bookId: string
  user_id: string
  answerText?: string // 텍스트 답변 (오디오만 있을 수도 있음)
  audioUrl?: string // Firebase Storage URL
  audioTranscript?: string // STT로 변환된 텍스트
  isPublic?: boolean // 공개 여부 (기본값: false)
  likesCount?: number // 좋아요 수 (캐시된 값)
  commentsCount?: number // 댓글 수 (캐시된 값)
  created_at?: Date
  updated_at?: Date
}

/**
 * 질문 그룹화를 위한 구조
 * 목차별로 질문을 계층적으로 그룹화
 */
export interface QuestionGroup {
  chapterPath: string[]
  questions: BookQuestion[]
  subGroups?: QuestionGroup[] // 하위 목차
}

/**
 * JSON 업로드용 타입
 * 노트북 LM에서 생성된 질문들을 일괄 업로드할 때 사용
 */
export interface BookQuestionsImport {
  bookId: string
  bookTitle: string
  questions: Omit<
    BookQuestion,
    "id" | "bookId" | "created_at" | "updated_at" | "order"
  >[]
}

/**
 * Speech Service 추상화 인터페이스
 * Web Speech API 또는 다른 STT/TTS 서비스로 교체 가능
 */
export interface ISpeechService {
  /**
   * 음성 인식 시작
   * @returns 인식된 텍스트
   */
  startRecognition(): Promise<string>

  /**
   * 음성 인식 중지
   */
  stopRecognition(): void

  /**
   * 텍스트를 음성으로 변환
   * @param text 변환할 텍스트
   * @returns 오디오 Blob
   */
  synthesize(text: string): Promise<Blob>

  /**
   * 음성 인식 지원 여부 확인
   */
  isRecognitionSupported(): boolean

  /**
   * 음성 합성 지원 여부 확인
   */
  isSynthesisSupported(): boolean
}

