import { NextResponse } from "next/server"
import { verifyFirebaseIdToken } from "@/lib/verifyFirebaseIdToken"
import { openaiChatJson } from "@/lib/openaiReadingServer"
import { parseJsonObjectFromModelText } from "@/lib/readingAiPrompts"
import { READING_AI_MODEL_OPTIONS } from "@/types/readingContent"
import { loadReadingAiGradingPromptsForUser } from "@/lib/resolveReadingAiGradingPrompts"

const ALLOWED = new Set(READING_AI_MODEL_OPTIONS.map((m) => m.id))

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      idToken?: string
      modelId?: string
      bookTitle?: string
      question?: string
      answerKey?: string
      scoringFocus?: string[]
      userAnswer?: string
    }

    if (!body.idToken || !(await verifyFirebaseIdToken(body.idToken))) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 })
    }

    const modelId =
      body.modelId && ALLOWED.has(body.modelId)
        ? body.modelId
        : READING_AI_MODEL_OPTIONS[0].id

    const q = (body.question ?? "").trim()
    const key = (body.answerKey ?? "").trim()
    const focus = Array.isArray(body.scoringFocus) ? body.scoringFocus : []
    const ans = (body.userAnswer ?? "").trim()

    if (!q || !ans) {
      return NextResponse.json(
        { error: "문항과 답안을 입력해 주세요." },
        { status: 400 }
      )
    }

    const prompts = await loadReadingAiGradingPromptsForUser(body.idToken)

    const user = JSON.stringify(
      {
        book_title: (body.bookTitle ?? "").trim(),
        question: q,
        answer_key: key,
        scoring_focus: focus,
        user_answer: ans,
      },
      null,
      0
    )

    const { content } = await openaiChatJson({
      model: modelId,
      messages: [
        { role: "system", content: prompts.examSystem },
        { role: "user", content: user },
      ],
      maxOut: 512,
    })

    const parsed = parseJsonObjectFromModelText(content)
    const score = Number(parsed.score)
    const feedback =
      typeof parsed.feedback === "string" ? parsed.feedback.trim() : ""

    if (!Number.isFinite(score) || score < 1 || score > 10) {
      return NextResponse.json(
        { error: "채점 결과를 해석하지 못했습니다. 다시 시도해 주세요." },
        { status: 502 }
      )
    }

    return NextResponse.json({ score, feedback })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "오류"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
