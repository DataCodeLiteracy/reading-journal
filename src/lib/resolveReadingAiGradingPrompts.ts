import {
  DEFAULT_EXAM_GRADING_SYSTEM,
  DEFAULT_EXCERPT_GRADING_SYSTEM,
  DEFAULT_GOLDEN_BELL_GRADING_SYSTEM,
} from "@/lib/readingAiGradingPromptDefaults"
import { getFirestoreDocumentMapAsUser } from "@/lib/firestoreRestUserRead"
import type { ReadingAiGradingPromptsConfig } from "@/types/readingAiGradingPrompts"

const DOC_PATH = "readingAiGradingPrompts/config"

function pickString(v: unknown): string | undefined {
  return typeof v === "string" && v.trim().length > 0 ? v.trim() : undefined
}

export async function loadReadingAiGradingPromptsForUser(
  idToken: string
): Promise<{
  examSystem: string
  excerptSystem: string
  goldenBellSystem: string
}> {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
  let overrides: ReadingAiGradingPromptsConfig = {}
  if (projectId) {
    const map = await getFirestoreDocumentMapAsUser(projectId, DOC_PATH, idToken)
    if (map) {
      overrides = {
        examSystem: pickString(map.examSystem),
        excerptSystem: pickString(map.excerptSystem),
        goldenBellSystem: pickString(map.goldenBellSystem),
      }
    }
  }
  return {
    examSystem: overrides.examSystem ?? DEFAULT_EXAM_GRADING_SYSTEM,
    excerptSystem: overrides.excerptSystem ?? DEFAULT_EXCERPT_GRADING_SYSTEM,
    goldenBellSystem: overrides.goldenBellSystem ?? DEFAULT_GOLDEN_BELL_GRADING_SYSTEM,
  }
}
