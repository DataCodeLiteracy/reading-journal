import { NextResponse } from "next/server"
import { verifyFirebaseIdToken } from "@/lib/verifyFirebaseIdToken"
import { openaiChatJson } from "@/lib/openaiReadingServer"
import { parseJsonObjectFromModelText } from "@/lib/readingAiPrompts"
import {
  isValidQuestionSuggestKind,
  isValidQuoteSuggestKind,
  labelForQuestionKind,
  labelForQuoteKind,
  QUESTION_TYPE_SUGGEST_SYSTEM,
  QUOTE_TYPE_SUGGEST_SYSTEM,
  RECORD_TYPE_SUGGEST_MIN_CHARS,
  RECORD_TYPE_SUGGEST_MODEL,
} from "@/lib/recordTypeSuggestPrompts"

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      idToken?: string
      mode?: "quote" | "question"
      text?: string
    }

    if (!body.idToken || !(await verifyFirebaseIdToken(body.idToken))) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 })
    }

    const mode = body.mode
    const text = (body.text ?? "").trim()

    if (mode !== "quote" && mode !== "question") {
      return NextResponse.json({ error: "mode는 quote 또는 question이어야 합니다." }, { status: 400 })
    }

    if (text.length < RECORD_TYPE_SUGGEST_MIN_CHARS) {
      return NextResponse.json(
        { error: `분석할 텍스트는 ${RECORD_TYPE_SUGGEST_MIN_CHARS}자 이상이어야 합니다.` },
        { status: 400 },
      )
    }

    const system = mode === "quote" ? QUOTE_TYPE_SUGGEST_SYSTEM : QUESTION_TYPE_SUGGEST_SYSTEM
    const userLabel = mode === "quote" ? "passage" : "question"

    const { content } = await openaiChatJson({
      model: RECORD_TYPE_SUGGEST_MODEL,
      messages: [
        { role: "system", content: system },
        { role: "user", content: JSON.stringify({ [userLabel]: text }) },
      ],
      maxOut: 80,
    })

    const parsed = parseJsonObjectFromModelText(content)
    const kind = typeof parsed.kind === "string" ? parsed.kind.trim() : ""

    const valid =
      mode === "quote" ? isValidQuoteSuggestKind(kind) : isValidQuestionSuggestKind(kind)

    if (!valid || !kind) {
      return NextResponse.json(
        { error: "유형 추천 결과를 해석하지 못했습니다. 다시 시도해 주세요." },
        { status: 502 },
      )
    }

    const label =
      typeof parsed.label === "string" && parsed.label.trim()
        ? parsed.label.trim()
        : mode === "quote"
          ? labelForQuoteKind(kind)
          : labelForQuestionKind(kind)

    return NextResponse.json({ kind, label })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "오류"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
