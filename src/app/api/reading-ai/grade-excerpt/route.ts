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
      chapterTitle?: string
      referenceSummary?: string
      keyKeywords?: string[]
      userSummary?: string
    }

    if (!body.idToken || !(await verifyFirebaseIdToken(body.idToken))) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 })
    }

    const modelId =
      body.modelId && ALLOWED.has(body.modelId)
        ? body.modelId
        : READING_AI_MODEL_OPTIONS[0].id

    const ref = (body.referenceSummary ?? "").trim()
    const user = (body.userSummary ?? "").trim()
    if (!ref || !user) {
      return NextResponse.json(
        { error: "요약과 작성 내용이 필요합니다." },
        { status: 400 }
      )
    }

    const prompts = await loadReadingAiGradingPromptsForUser(body.idToken)

    const payload = JSON.stringify(
      {
        book_title: (body.bookTitle ?? "").trim(),
        chapter_title: body.chapterTitle ?? "",
        reference_summary: ref,
        key_keywords: Array.isArray(body.keyKeywords) ? body.keyKeywords : [],
        user_summary: user,
      },
      null,
      0
    )

    const { content } = await openaiChatJson({
      model: modelId,
      messages: [
        { role: "system", content: prompts.excerptSystem },
        { role: "user", content: payload },
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
