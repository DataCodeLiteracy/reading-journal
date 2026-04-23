import { AppDate } from "./firebase"

/** 이해도 점검 JSON: 구간별 퀴즈 */
export interface ReadingExamQuizItem {
  question_number: number
  question: string
  answer_key: string
  scoring_focus: string[]
}

export interface ReadingExamRangeBlock {
  range: string
  quizzes: ReadingExamQuizItem[]
}

export interface ReadingExamAssessmentJson {
  assessment_data: ReadingExamRangeBlock[]
}

/** 발췌 요약 JSON */
export interface ReadingExcerptChapterJson {
  title: string
  /** 목차 경로 (예: "9", "9.1", "9.1.1", "9.1.1.1"). 계층 표시에 사용됩니다. */
  path?: string
  /** 목차 단계 (1–4). path로 계산하는 것과 동일하지만 명시적으로 제공됩니다. */
  level?: number
  /** 챕터 고유 식별자 (선택). */
  chapter_id?: string
  /**
   * 추출 파이프라인에서 붙는 대략적 페이지 정보로, 정확하지 않을 수 있습니다.
   * 앱 UI와 AI 채점에는 사용하지 않습니다.
   */
  page_estimate?: string
  summary: string
  key_keywords: string[]
}

export interface ReadingExcerptBookMetadataJson {
  title: string
  total_pages: number
  overall_summary: string
}

export interface ReadingExcerptSummaryJson {
  book_metadata: ReadingExcerptBookMetadataJson
  chapter_summaries: ReadingExcerptChapterJson[]
}

/** Firestore: readingContentPacks/{packDocId} */
export interface ReadingContentPack {
  id: string
  titleKey: string
  bookTitleDisplay: string
  examAssessmentData?: ReadingExamRangeBlock[]
  excerptBookMetadata?: ReadingExcerptBookMetadataJson
  excerptChapterSummaries?: ReadingExcerptChapterJson[]
  createdBy?: string
  created_at?: AppDate
  updated_at?: AppDate
}

export interface ReadingExamQuestionGrade {
  score: number
  feedback: string
  gradedAt: string
  /** 이 문항에서 수행한 AI 채점 횟수 (최대 3) */
  attemptsUsed?: number
  /** 마지막 채점에 사용된 답안(다시 채점하려면 답안이 달라야 함) */
  lastGradedAnswer?: string
}

/** readingExamProgress/{userId}__{bookId} */
export interface ReadingExamProgress {
  id: string
  userId: string
  bookId: string
  titleKey: string
  currentRangeIndex: number
  currentQuizIndex: number
  draftAnswers: Record<number, string>
  grades: Record<number, ReadingExamQuestionGrade>
  updated_at?: AppDate
}

/** readingExcerptProgress/{userId}__{bookId} */
export interface ReadingExcerptChapterResult {
  userText: string
  /** undefined = 아직 AI 채점 전 (사전 답안 저장 상태) */
  score?: number
  feedback?: string
  gradedAt?: string
  /** 이 챕터에서 수행한 AI 채점 횟수 (최대 3) */
  attemptsUsed?: number
  /** 마지막 채점에 사용한 요약(내용이 바뀌면 재채점 가능) */
  lastGradedUserText?: string
}

export interface ReadingExcerptProgress {
  id: string
  userId: string
  bookId: string
  titleKey: string
  currentChapterIndex: number
  chapters: Record<number, ReadingExcerptChapterResult>
  /** 책 전체에 대한 나만의 요약(JSON의 overall_summary와 별도) */
  overallSummaryUserText?: string
  /** 완독 후 남기는 핵심 메시지(한 줄·두 줄 등, 여러 개 추가 가능) */
  coreMessages?: string[]
  updated_at?: AppDate
}

export type ReadingAiModelFamily = "gpt4" | "gpt5"

export interface ReadingAiModelOption {
  id: string
  label: string
  family: ReadingAiModelFamily
}

export const READING_AI_MODEL_OPTIONS: ReadingAiModelOption[] = [
  { id: "gpt-4o", label: "GPT-4o", family: "gpt4" },
  { id: "gpt-4o-mini", label: "GPT-4o mini", family: "gpt4" },
  { id: "gpt-4-turbo", label: "GPT-4 Turbo", family: "gpt4" },
  { id: "gpt-5", label: "GPT-5", family: "gpt5" },
  { id: "gpt-5-mini", label: "GPT-5 mini", family: "gpt5" },
]

/** adminSettings/settings */
export interface AdminAiSettings {
  readingGradingModelId: string
  updated_at?: AppDate
}
