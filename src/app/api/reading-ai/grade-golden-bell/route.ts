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
      questionType?: string
      question?: string
      referenceAnswer?: string
      explanation?: string
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
    const ref = (body.referenceAnswer ?? "").trim()
    const ua = (body.userAnswer ?? "").trim()
    const qt = (body.questionType ?? "").trim()

    if (!q || !ua || (qt !== "short_answer" && qt !== "essay")) {
      return NextResponse.json(
        { error: "문항·답안·유형(short_answer|essay)이 필요합니다." },
        { status: 400 }
      )
    }

    const prompts = await loadReadingAiGradingPromptsForUser(body.idToken)

    const user = JSON.stringify(
      {
        book_title: (body.bookTitle ?? "").trim(),
        question_type: qt,
        question: q,
        reference_answer: ref,
        explanation: (body.explanation ?? "").trim(),
        user_answer: ua,
      },
      null,
      0
    )

    const { content } = await openaiChatJson({
      model: modelId,
      messages: [
        { role: "system", content: prompts.goldenBellSystem },
        { role: "user", content: user },
      ],
      maxOut: 512,
    })

    const parsed = parseJsonObjectFromModelText(content)
    const rawCorrect = parsed.is_correct ?? parsed.isCorrect
    const isCorrect =
      rawCorrect === true ||
      rawCorrect === "true" ||
      (typeof rawCorrect === "string" && rawCorrect.toLowerCase() === "true")
    const feedback =
      typeof parsed.feedback === "string" ? parsed.feedback.trim() : ""

    if (typeof rawCorrect !== "boolean" && typeof rawCorrect !== "string") {
      return NextResponse.json(
        { error: "채점 결과를 해석하지 못했습니다. 다시 시도해 주세요." },
        { status: 502 }
      )
    }

    return NextResponse.json({ isCorrect, feedback })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "오류"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
