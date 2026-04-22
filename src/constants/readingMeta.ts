/**
 * 독서 메타데이터(구절 하이라이트, 질문 초점, 구절 목적 태그) — 코드에 고정.
 * 관리자·유저 커스텀 확장은 추후 별도 설계.
 */

/** 구절을 어떤 관점에서 특히 남겼는지 */
export type QuoteHighlightKind =
  | "favorite_line"
  | "memorable"
  | "vocabulary"
  | "plot_turn"
  | "none"

export const QUOTE_HIGHLIGHT_OPTIONS: ReadonlyArray<{
  value: QuoteHighlightKind
  label: string
  description: string
}> = [
  {
    value: "favorite_line",
    label: "애착 구절",
    description:
      "문장이 특히 좋아 나중에 다시 찾아보거나, 따라 읽어 보고 싶은 한 줄·한 문단이에요.",
  },
  {
    value: "memorable",
    label: "인상 깊은 구절",
    description:
      "내용·상황·이미지가 오래 남거나, 책을 떠올릴 때 가장 먼저 떠오르는 부분이에요.",
  },
  {
    value: "vocabulary",
    label: "표현·어휘",
    description:
      "단어나 비유, 문장 짜임이 새롭거나 배워 두고 싶은 표현이에요. (말모이 등으로 이어가기 좋아요.)",
  },
  {
    value: "plot_turn",
    label: "전개·감정",
    description:
      "소설 등에서 사건이 꺾이거나, 인물의 마음이 드러나는 등 장면의 핵심으로 느껴지는 부분이에요.",
  },
  {
    value: "none",
    label: "선택 안 함",
    description: "아직 분류하지 않았거나, 여러 이유가 겹쳐 한 가지로만 정하기 어려울 때예요.",
  },
]

/** 질문이 무엇을 겨냥하는지(질문 유형 questionType과 별개) */
export type QuestionFocusKind =
  | "comprehension"
  | "interpretation"
  | "craft"
  | "connection"
  | "evaluation"
  | "open"
  | "none"

export const QUESTION_FOCUS_OPTIONS: ReadonlyArray<{
  value: QuestionFocusKind
  label: string
  description: string
}> = [
  {
    value: "comprehension",
    label: "내용·사실",
    description: "무슨 일이 일어나는지, 인물·설정·정보를 정확히 짚고 싶을 때예요.",
  },
  {
    value: "interpretation",
    label: "해석·의미",
    description:
      "왜 이렇게 썼는지, 상징·주제·문맥 속 의미를 더 깊게 헤아리고 싶을 때예요.",
  },
  {
    value: "craft",
    label: "문장·구성",
    description:
      "리듬, 반복, 전환, 문장 길이 등 글쓰기·구성이 어떻게 효과를 내는지 보고 싶을 때예요.",
  },
  {
    value: "connection",
    label: "연결·적용",
    description: "내 경험, 다른 책, 뉴스·세상과 어떻게 맞닿는지 떠올리고 싶을 때예요.",
  },
  {
    value: "evaluation",
    label: "평가·비평",
    description:
      "설득력, 공정성, 톤 등 이 글이 나에게 어떻게 작동하는지 판단하고 싶을 때예요.",
  },
  {
    value: "open",
    label: "열린 질문",
    description: "위에 해당하기 어렵거나, 그냥 궁금한 것을 자유롭게 남기고 싶을 때예요.",
  },
  {
    value: "none",
    label: "선택 안 함",
    description: "초점을 정하지 않았거나, 나중에 정리해도 될 때예요.",
  },
]

export function quoteHighlightLabel(kind: string | undefined): string {
  if (!kind || kind === "none") return ""
  const o = QUOTE_HIGHLIGHT_OPTIONS.find((x) => x.value === kind)
  return o?.label ?? kind
}

export function questionFocusLabel(kind: string | undefined): string {
  if (!kind || kind === "none") return ""
  const o = QUESTION_FOCUS_OPTIONS.find((x) => x.value === kind)
  return o?.label ?? kind
}

export function questionFocusDescription(kind: string | undefined): string {
  if (!kind || kind === "none") return ""
  return QUESTION_FOCUS_OPTIONS.find((x) => x.value === kind)?.description ?? ""
}

const READING_PHASE_LABELS: Record<string, string> = {
  pre: "읽기 준비",
  during: "읽는 중",
  post: "읽은 뒤",
}

export function readingPhaseLabel(phase: string | undefined): string {
  if (!phase) return ""
  return READING_PHASE_LABELS[phase] ?? phase
}

/** 질문 유형(questionType) — UI 도움말 */
export const QUESTION_TYPE_HELP: Record<string, string> = {
  general: "형식을 특정하기 어려울 때. 자유로운 호기심·탐색용 질문에 가깝습니다.",
  comprehension: "책에 적힌 사실·사건·설명을 정확히 짚고 싶을 때(무엇이·언제·누가).",
  analysis: "원인과 결과, 비교, 인과를 따라가고 싶을 때(왜·그래서).",
  synthesis: "여러 부분을 묶어 주제·메시지·한 줄 결론을 말하고 싶을 때.",
  application: "책의 내용을 내 삶·선택·현실에 옮겨 보고 싶을 때.",
}

/** 난이도 — UI 도움말 */
export const QUESTION_DIFFICULTY_HELP: Record<string, string> = {
  easy: "책만 보면 답이 비교적 바로 보이거나, 짧게 생각하면 될 때.",
  medium: "한 번 더 생각하거나, 근거를 몇 문장 모아야 할 때.",
  hard: "여러 장을 넘나들거나, 추론·비평 수준이 필요할 때.",
}

/** 구절 모달「목적」체크박스 — slug → 한글 라벨 + 짧은 설명 */
export const QUOTE_PURPOSE_META: ReadonlyArray<{
  slug: string
  label: string
  description: string
}> = [
  {
    slug: "core_message",
    label: "핵심 메시지",
    description: "이 챕터·이 부분이 전하려는 한 가지 중심이 무엇인지 짚을 때.",
  },
  {
    slug: "perspective_shift",
    label: "시각 전환",
    description: "내가 당연히 여기던 생각이 바뀌거나, 다른 각도로 보이게 될 때.",
  },
  {
    slug: "deep_reflection",
    label: "깊은 성찰",
    description: "나 자신·삶·가치에 대해 오래 생각하게 만드는 문장일 때.",
  },
  {
    slug: "real_life_connection",
    label: "실생활 연결",
    description: "지금 내 일·관계·선택과 직접 연결되어 떠오를 때.",
  },
  {
    slug: "author_problem_awareness",
    label: "작가 의도",
    description: "작가가 왜 이렇게 썼을지, 무엇을 문제 삼는지 짚고 싶을 때.",
  },
  {
    slug: "memorable_expression",
    label: "인상적 표현",
    description: "비유, 리듬, 단어 선택이 기억에 남을 때. (「표현·어휘」와 겹칠 수 있어요.)",
  },
]
