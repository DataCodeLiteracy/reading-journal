/**
 * 타이핑 기억 필사용 노출 시간·힌트·정답 비교.
 */

export type TranscriptionDifficulty = "easy" | "normal" | "hard"

/** 난이도별 10글자당 노출 시간(초) — 띄어쓰기 제외 글자 기준 */
const SECONDS_PER_10_CHARS: Record<TranscriptionDifficulty, number> = {
  easy: 2.5,
  normal: 2,
  hard: 1.5,
}

/** 아주 짧은 문장도 읽을 시간은 확보 */
export const MIN_EXPOSURE_SECONDS = 1.5

export const DIFFICULTY_LABELS: Record<TranscriptionDifficulty, string> = {
  easy: "여유",
  normal: "보통",
  hard: "빡셈",
}

/** 띄어쓰기·줄바꿈 등 공백을 제외한 글자 수 */
export function countTranscriptionChars(text: string): number {
  return text.replace(/\s/g, "").length
}

/** 초 = (공백 제외 글자수) ÷ 10 × 난이도 초 (최소 MIN_EXPOSURE_SECONDS) */
export function getExposureSeconds(
  charCount: number,
  difficulty: TranscriptionDifficulty = "normal",
): number {
  const chars = Math.max(0, charCount)
  const seconds = (chars / 10) * SECONDS_PER_10_CHARS[difficulty]
  return Math.max(MIN_EXPOSURE_SECONDS, seconds)
}

/** 10글자당 노출 시간(초) */
export function getSecondsPer10Chars(
  difficulty: TranscriptionDifficulty = "normal",
): number {
  return SECONDS_PER_10_CHARS[difficulty]
}

/** 힌트(잠시 다시 보기) 횟수: 3 + floor(chars/40), 상한 6 — 공백 제외 */
export function getHintCount(charCount: number): number {
  const chars = Math.max(0, charCount)
  return Math.min(6, 3 + Math.floor(chars / 40))
}

/** 성공 시 지급 EXP. 공백 제외 1글자 = 0.5 EXP (홀수면 .5). 답 공개 시 0. */
export const TRANSCRIPTION_EXP_PER_CHAR = 0.5

export function getTranscriptionSuccessExp(charCount: number): number {
  const chars = Math.max(0, charCount)
  // 0.5 단위이므로 자연스럽게 소수 1자리
  return Math.round(chars * TRANSCRIPTION_EXP_PER_CHAR * 10) / 10
}

/** 비교용 정규화: 앞뒤 공백 제거, 연속 공백·줄바꿈 축약 */
export function normalizeTranscriptionAnswer(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\s+/g, " ")
    .trim()
}

export function isTranscriptionAnswerCorrect(
  input: string,
  expected: string,
): boolean {
  return (
    normalizeTranscriptionAnswer(input) ===
    normalizeTranscriptionAnswer(expected)
  )
}

/** 문장 카드·입력란 공통 타이포 (줄바꿈 비교용) */
export const TRANSCRIPTION_PRACTICE_TEXT_CLASS =
  "whitespace-pre-wrap text-base leading-relaxed"
