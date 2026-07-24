import type { TranscriptionUnitMode } from "@/utils/transcriptionSentences"
import type { TranscriptionDifficulty } from "@/utils/transcriptionPractice"
import { DEFAULT_TRANSCRIPTION_REPETITIONS } from "@/utils/transcriptionLayout"

export const TRANSCRIPTION_SELECTION_KEY = "transcription:selection"
export const TRANSCRIPTION_OPTIONS_KEY = "transcription:options"

export type TranscriptionMode = "print" | "practice"

export type TranscriptionSelectionItem = {
  id: string
  quoteText: string
  bookTitle?: string
  bookAuthor?: string
  bookId?: string
}

export type TranscriptionSessionOptions = {
  mode: TranscriptionMode
  repetitions: number
  unitMode: TranscriptionUnitMode
  difficulty: TranscriptionDifficulty
}

const DEFAULT_OPTIONS: TranscriptionSessionOptions = {
  mode: "print",
  repetitions: DEFAULT_TRANSCRIPTION_REPETITIONS,
  unitMode: "sentence",
  difficulty: "normal",
}

export function loadTranscriptionSelection(): TranscriptionSelectionItem[] {
  if (typeof window === "undefined") return []
  try {
    const raw = sessionStorage.getItem(TRANSCRIPTION_SELECTION_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as TranscriptionSelectionItem[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function saveTranscriptionSelection(
  items: TranscriptionSelectionItem[],
): void {
  if (typeof window === "undefined") return
  sessionStorage.setItem(TRANSCRIPTION_SELECTION_KEY, JSON.stringify(items))
}

export function clearTranscriptionSelection(): void {
  if (typeof window === "undefined") return
  sessionStorage.removeItem(TRANSCRIPTION_SELECTION_KEY)
}

export function loadTranscriptionOptions(): TranscriptionSessionOptions {
  if (typeof window === "undefined") return { ...DEFAULT_OPTIONS }
  try {
    const raw = sessionStorage.getItem(TRANSCRIPTION_OPTIONS_KEY)
    if (!raw) return { ...DEFAULT_OPTIONS }
    const parsed = JSON.parse(raw) as Partial<TranscriptionSessionOptions>
    return {
      mode: parsed.mode === "practice" ? "practice" : "print",
      repetitions:
        typeof parsed.repetitions === "number"
          ? parsed.repetitions
          : DEFAULT_TRANSCRIPTION_REPETITIONS,
      unitMode: parsed.unitMode === "quote" ? "quote" : "sentence",
      difficulty:
        parsed.difficulty === "easy" || parsed.difficulty === "hard"
          ? parsed.difficulty
          : "normal",
    }
  } catch {
    return { ...DEFAULT_OPTIONS }
  }
}

/** @deprecated use TranscriptionSessionOptions */
export type TranscriptionPrintOptions = TranscriptionSessionOptions

export function saveTranscriptionOptions(
  options: TranscriptionSessionOptions,
): void {
  if (typeof window === "undefined") return
  sessionStorage.setItem(TRANSCRIPTION_OPTIONS_KEY, JSON.stringify(options))
}
