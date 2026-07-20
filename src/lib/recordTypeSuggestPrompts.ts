import {
  QUESTION_FOCUS_OPTIONS,
  QUOTE_HIGHLIGHT_OPTIONS,
  type QuestionFocusKind,
  type QuoteHighlightKind,
} from "@/constants/readingMeta"

export const RECORD_TYPE_SUGGEST_MIN_CHARS = 10

/** 유형 추천 전용 — 채점 모델과 분리해 mini 고정 */
export const RECORD_TYPE_SUGGEST_MODEL = "gpt-4o-mini"

const QUOTE_KINDS = QUOTE_HIGHLIGHT_OPTIONS.filter((o) => o.value !== "none").map(
  (o) => o.value,
)

const QUESTION_KINDS = QUESTION_FOCUS_OPTIONS.filter((o) => o.value !== "none").map(
  (o) => o.value,
)

function formatOptionLines(
  options: ReadonlyArray<{ value: string; label: string; hint: string }>,
): string {
  return options
    .filter((o) => o.value !== "none")
    .map((o) => `- ${o.value}: ${o.label} (${o.hint})`)
    .join("\n")
}

export const QUOTE_TYPE_SUGGEST_SYSTEM = `You classify a quoted passage from a book into exactly one category for a reading journal app.

Pick the single best category slug from this list:
${formatOptionLines(QUOTE_HIGHLIGHT_OPTIONS)}

Rules:
- Choose only one slug from the list above, or "none" if truly unclear.
- Base your judgment only on the passage text provided.
- Respond with JSON only, no markdown: {"kind":"<slug>","label":"<Korean label matching the category>"}`

export const QUESTION_TYPE_SUGGEST_SYSTEM = `You classify a reader's question about a book into exactly one focus type for a reading journal app.

Pick the single best category slug from this list:
${formatOptionLines(QUESTION_FOCUS_OPTIONS)}

Rules:
- Choose only one slug from the list above, or "none" if truly unclear.
- Base your judgment only on the question text provided.
- Respond with JSON only, no markdown: {"kind":"<slug>","label":"<Korean label matching the category>"}`

export function isValidQuoteSuggestKind(kind: string): kind is QuoteHighlightKind {
  return (QUOTE_KINDS as string[]).includes(kind) || kind === "none"
}

export function isValidQuestionSuggestKind(kind: string): kind is QuestionFocusKind {
  return (QUESTION_KINDS as string[]).includes(kind) || kind === "none"
}

export function labelForQuoteKind(kind: string): string {
  return QUOTE_HIGHLIGHT_OPTIONS.find((o) => o.value === kind)?.label ?? kind
}

export function labelForQuestionKind(kind: string): string {
  return QUESTION_FOCUS_OPTIONS.find((o) => o.value === kind)?.label ?? kind
}
