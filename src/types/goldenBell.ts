/** 골든벨 문제 타입 */
export type QuestionType = "객관식" | "단답형" | "서술형"

/** 골든벨 난이도 */
export type GoldenBellDifficulty = "easy" | "hard"

export const GOLDEN_BELL_DIFFICULTIES: { value: GoldenBellDifficulty; label: string }[] = [
  { value: "easy", label: "쉬운 버전" },
  { value: "hard", label: "어려운 버전" },
]

/** 골든벨 개별 문제 */
export interface GoldenBellQuestion {
  id: number
  type: QuestionType
  question: string
  options: string[] // 객관식일 경우 선택지, 아니면 빈 배열
}

/** 골든벨 개별 답안 */
export interface GoldenBellAnswer {
  id: number
  answer: string
  explanation: string
}

/** 골든벨 문서 정보 */
export interface GoldenBellDocumentInfo {
  title: string
  version: string
}

/** 골든벨 JSON 구조 (업로드용) */
export interface GoldenBellJsonData {
  document_info: GoldenBellDocumentInfo
  core_points: string[]
  questions: GoldenBellQuestion[]
  answers: GoldenBellAnswer[]
}

/** Firestore에 저장되는 골든벨 퀴즈 */
export interface GoldenBellQuiz {
  id: string
  /** 책 제목 (같은 제목의 책들이 공유) */
  bookTitle: string
  /** 버전 (예: "1.0" 등) */
  version: string
  /** 난이도 */
  difficulty: GoldenBellDifficulty
  /** 문제 배열 */
  questions: GoldenBellQuestion[]
  /** 답안 배열 */
  answers: GoldenBellAnswer[]
  /** 등록한 사용자 ID */
  createdBy: string
  created_at?: Date
  updated_at?: Date
}

/** 골든벨 퀴즈 요약 정보 (카드 표시용) */
export interface GoldenBellQuizSummary {
  id: string
  version: string
  difficulty: GoldenBellDifficulty
  totalQuestions: number
  multipleChoiceCount: number
  shortAnswerCount: number
  essayCount: number
}

/** 사용자의 골든벨 문제 응답 */
export interface GoldenBellUserAnswer {
  questionId: number
  questionType: QuestionType
  userAnswer: string
  correctAnswer: string
  /** 자동 채점 결과 */
  autoGraded: boolean
  /** 자동 채점 유사도 (단답형만 해당, 0-1) */
  similarity?: number
  /** AI 채점 사용 여부 (골든벨 주관식) */
  aiGraded?: boolean
  /** AI 한 줄 피드백 */
  aiFeedback?: string
  /** 최종 정답 여부 (사용자 확인 후 확정) */
  isCorrect: boolean
  /** 사용자가 수동으로 수정했는지 여부 */
  manuallyGraded?: boolean
}

/** 골든벨 결과 (Firestore 저장용) */
export interface GoldenBellResult {
  id: string
  /** 퀴즈 ID */
  quizId: string
  /** 책 제목 */
  bookTitle: string
  /** 난이도 */
  difficulty: GoldenBellDifficulty
  /** 사용자 ID */
  userId: string
  /** 총 문제 수 */
  totalQuestions: number
  /** 정답 수 */
  correctCount: number
  /** 점수 (0-100) */
  score: number
  /** 각 문제별 사용자 응답 */
  answers: GoldenBellUserAnswer[]
  /** 풀이 완료 시간 */
  completedAt: Date
  created_at?: Date
  updated_at?: Date
}

/** 결과 요약 (목록 표시용) */
export interface GoldenBellResultSummary {
  id: string
  quizId: string
  bookTitle: string
  difficulty: GoldenBellDifficulty
  totalQuestions: number
  correctCount: number
  score: number
  completedAt: Date
}

/** 골든벨 출제 요청 (Firestore 저장용) */
export interface GoldenBellRequest {
  id: string
  /** 요청한 사용자 ID */
  user_id: string
  /** 요청한 사용자 표시명 */
  user_display_name?: string
  /** 책 ID */
  book_id: string
  /** 책 제목 */
  book_title: string
  /** 상태 */
  status: "pending" | "done"
  created_at?: Date
  updated_at?: Date
}
