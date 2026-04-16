import { auth } from "@/lib/firebase"
import { AdminAiSettingsService } from "@/services/adminAiSettingsService"

async function authPayload(): Promise<{ idToken: string; modelId: string }> {
  const user = auth.currentUser
  if (!user) throw new Error("로그인이 필요합니다.")
  const idToken = await user.getIdToken()
  const settings = await AdminAiSettingsService.get()
  return { idToken, modelId: settings.readingGradingModelId }
}

export async function gradeReadingExam(input: {
  bookTitle?: string
  question: string
  answerKey: string
  scoringFocus: string[]
  userAnswer: string
}): Promise<{ score: number; feedback: string }> {
  const { idToken, modelId } = await authPayload()
  const res = await fetch("/api/reading-ai/grade-exam", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      idToken,
      modelId,
      bookTitle: input.bookTitle ?? "",
      question: input.question,
      answerKey: input.answerKey,
      scoringFocus: input.scoringFocus,
      userAnswer: input.userAnswer,
    }),
  })
  const data = (await res.json()) as { error?: string; score?: number; feedback?: string }
  if (!res.ok) throw new Error(data.error || "채점 요청에 실패했습니다.")
  return { score: data.score!, feedback: data.feedback ?? "" }
}

export async function gradeReadingExcerpt(input: {
  bookTitle?: string
  chapterTitle: string
  referenceSummary: string
  keyKeywords: string[]
  userSummary: string
}): Promise<{ score: number; feedback: string }> {
  const { idToken, modelId } = await authPayload()
  const res = await fetch("/api/reading-ai/grade-excerpt", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      idToken,
      modelId,
      bookTitle: input.bookTitle ?? "",
      chapterTitle: input.chapterTitle,
      referenceSummary: input.referenceSummary,
      keyKeywords: input.keyKeywords,
      userSummary: input.userSummary,
    }),
  })
  const data = (await res.json()) as { error?: string; score?: number; feedback?: string }
  if (!res.ok) throw new Error(data.error || "채점 요청에 실패했습니다.")
  return { score: data.score!, feedback: data.feedback ?? "" }
}

export async function gradeReadingReview(input: {
  overallSummary: string
  userReview: string
}): Promise<{ score: number; feedback: string }> {
  const { idToken, modelId } = await authPayload()
  const res = await fetch("/api/reading-ai/grade-review", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      idToken,
      modelId,
      overallSummary: input.overallSummary,
      userReview: input.userReview,
    }),
  })
  const data = (await res.json()) as { error?: string; score?: number; feedback?: string }
  if (!res.ok) throw new Error(data.error || "채점 요청에 실패했습니다.")
  return { score: data.score!, feedback: data.feedback ?? "" }
}

export async function gradeGoldenBellOpen(input: {
  bookTitle: string
  questionType: "short_answer" | "essay"
  question: string
  referenceAnswer: string
  explanation?: string
  userAnswer: string
}): Promise<{ isCorrect: boolean; feedback: string }> {
  const { idToken, modelId } = await authPayload()
  const res = await fetch("/api/reading-ai/grade-golden-bell", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      idToken,
      modelId,
      bookTitle: input.bookTitle,
      questionType: input.questionType,
      question: input.question,
      referenceAnswer: input.referenceAnswer,
      explanation: input.explanation ?? "",
      userAnswer: input.userAnswer,
    }),
  })
  const data = (await res.json()) as {
    error?: string
    isCorrect?: boolean
    feedback?: string
  }
  if (!res.ok) throw new Error(data.error || "채점 요청에 실패했습니다.")
  return { isCorrect: Boolean(data.isCorrect), feedback: data.feedback ?? "" }
}
