import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import {
  DEFAULT_EXAM_GRADING_SYSTEM,
  DEFAULT_EXCERPT_GRADING_SYSTEM,
  DEFAULT_GOLDEN_BELL_GRADING_SYSTEM,
} from "@/lib/readingAiGradingPromptDefaults"
import type { ReadingAiGradingPromptsConfig } from "@/types/readingAiGradingPrompts"

const COLLECTION = "readingAiGradingPrompts"
const DOC_ID = "config"

export class ReadingAiGradingPromptsService {
  static async get(): Promise<{
    examSystem: string
    excerptSystem: string
    goldenBellSystem: string
  }> {
    const ref = doc(db, COLLECTION, DOC_ID)
    const snap = await getDoc(ref)
    if (!snap.exists()) {
      return {
        examSystem: DEFAULT_EXAM_GRADING_SYSTEM,
        excerptSystem: DEFAULT_EXCERPT_GRADING_SYSTEM,
        goldenBellSystem: DEFAULT_GOLDEN_BELL_GRADING_SYSTEM,
      }
    }
    const d = snap.data() as Record<string, unknown>
    return {
      examSystem:
        typeof d.examSystem === "string" && d.examSystem.trim()
          ? d.examSystem.trim()
          : DEFAULT_EXAM_GRADING_SYSTEM,
      excerptSystem:
        typeof d.excerptSystem === "string" && d.excerptSystem.trim()
          ? d.excerptSystem.trim()
          : DEFAULT_EXCERPT_GRADING_SYSTEM,
      goldenBellSystem:
        typeof d.goldenBellSystem === "string" && d.goldenBellSystem.trim()
          ? d.goldenBellSystem.trim()
          : DEFAULT_GOLDEN_BELL_GRADING_SYSTEM,
    }
  }

  static async setAll(data: ReadingAiGradingPromptsConfig): Promise<void> {
    const ref = doc(db, COLLECTION, DOC_ID)
    await setDoc(
      ref,
      {
        examSystem: data.examSystem ?? "",
        excerptSystem: data.excerptSystem ?? "",
        goldenBellSystem: data.goldenBellSystem ?? "",
        updated_at: serverTimestamp(),
      },
      { merge: true }
    )
  }
}
