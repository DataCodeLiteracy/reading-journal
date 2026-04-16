import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"
import {
  AdminAiSettings,
  READING_AI_MODEL_OPTIONS,
} from "@/types/readingContent"

const COLLECTION = "adminSettings"
const DOC_ID = "settings"

const DEFAULT_MODEL_ID = READING_AI_MODEL_OPTIONS[0]?.id ?? "gpt-4o"

export class AdminAiSettingsService {
  static async get(): Promise<AdminAiSettings> {
    const ref = doc(db, COLLECTION, DOC_ID)
    const snap = await getDoc(ref)
    if (!snap.exists()) {
      return { readingGradingModelId: DEFAULT_MODEL_ID }
    }
    const d = snap.data() as Record<string, unknown>
    const id =
      typeof d.readingGradingModelId === "string"
        ? d.readingGradingModelId
        : DEFAULT_MODEL_ID
    const allowed = new Set(READING_AI_MODEL_OPTIONS.map((m) => m.id))
    return {
      readingGradingModelId: allowed.has(id) ? id : DEFAULT_MODEL_ID,
    }
  }

  static async setReadingGradingModelId(modelId: string): Promise<void> {
    const allowed = new Set(READING_AI_MODEL_OPTIONS.map((m) => m.id))
    if (!allowed.has(modelId)) {
      throw new Error("허용되지 않은 모델입니다.")
    }
    const ref = doc(db, COLLECTION, DOC_ID)
    await setDoc(
      ref,
      {
        readingGradingModelId: modelId,
        updated_at: serverTimestamp(),
      },
      { merge: true }
    )
  }
}
