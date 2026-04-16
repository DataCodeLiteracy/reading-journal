import type { AppDate } from "./firebase"

/** Firestore: readingAiGradingPrompts/config (관리자 편집) */
export interface ReadingAiGradingPromptsConfig {
  examSystem?: string
  excerptSystem?: string
  goldenBellSystem?: string
  updated_at?: AppDate
}
