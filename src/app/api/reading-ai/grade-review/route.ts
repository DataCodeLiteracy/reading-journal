import { NextResponse } from "next/server"
import { verifyFirebaseIdToken } from "@/lib/verifyFirebaseIdToken"
import { openaiChatJson } from "@/lib/openaiReadingServer"
import { parseJsonObjectFromModelText } from "@/lib/readingAiPrompts"
import { READING_AI_MODEL_OPTIONS } from "@/types/readingContent"

const ALLOWED = new Set(READING_AI_MODEL_OPTIONS.map((m) => m.id))

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      idToken?: string
      modelId?: string
      overallSummary?: string
      userReview?: string
    }

    if (!body.idToken || !(await verifyFirebaseIdToken(body.idToken))) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 })
    }

    const modelId =
      body.modelId && ALLOWED.has(body.modelId)
        ? body.modelId
        : READING_AI_MODEL_OPTIONS[0].id

    const overall = (body.overallSummary ?? "").trim()
    const review = (body.userReview ?? "").trim()

    if (!overall || !review) {
      return NextResponse.json(
        { error: "요약과 리뷰가 필요합니다." },
        { status: 400 }
      )
    }

    const system = `당신은 짧은 독서 리뷰가 책 전체 요약(overall_summary)과 얼마나 맞닿아 있는지 평가합니다.
반드시 JSON 한 객체만 출력하세요.
키: score (1~10 정수), feedback (한국어 한 줄 피드백 "AI 한 줄 피드백" 느낌으로, 120자 이내).`

    const user = JSON.stringify(
      {
        overall_summary: overall,
        user_review: review,
      },
      null,
      0
    )

    const { content } = await openaiChatJson({
      model: modelId,
      messages: [
        { role: "system", content: system },
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
