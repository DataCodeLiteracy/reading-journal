/**
 * 독서 메타데이터(구절 유형, 질문 유형, 구절 목적 태그) — 코드에 고정.
 * 관리자·유저 커스텀 확장은 추후 별도 설계.
 */

/** 구절을 어떤 마음으로 남겼는지 — UI에서는 「구절 유형」 */
export type QuoteHighlightKind =
  | "moving"
  | "obscure"
  | "questioning"
  | "amusing"
  | "core"
  | "important"
  | "connected"
  | "none"
  /** @deprecated 이전 분류 — DB에 남아 있을 수 있음 */
  | "favorite_line"
  | "memorable"
  | "vocabulary"
  | "plot_turn"

export type MetaSelectOption<T extends string> = {
  value: T
  label: string
  description: string
  hint: string
  /** 기록한 이유 / 질문과 함께 남기는 생각 */
  recordReasonPlaceholder: string
  /** 구절: 느낌·생각 (구절 기록만) */
  thoughtsPlaceholder?: string
}

export const QUOTE_HIGHLIGHT_OPTIONS: ReadonlyArray<MetaSelectOption<QuoteHighlightKind>> = [
  {
    value: "moving",
    label: "감동",
    hint: "마음이 움직이는",
    description: "마음이 움직이거나 울림이 느껴지는 문장이에요.",
    recordReasonPlaceholder: "예: 이 문장에서 마음이 먹먹해져서 꼭 남겨 두고 싶다…",
    thoughtsPlaceholder: "예: 어떤 감정이 들었는지, 왜 울림이 있었는지…",
  },
  {
    value: "obscure",
    label: "난해",
    hint: "뜻이 안 와닿는",
    description: "뜻이나 맥락이 잘 와닿지 않는 문장이에요.",
    recordReasonPlaceholder: "예: 뜻을 더 찾아보려고 일단 저장해 둔다…",
    thoughtsPlaceholder: "예: 어떤 부분이 헷갈리는지, 어떻게 이해하려 했는지…",
  },
  {
    value: "questioning",
    label: "의문",
    hint: "더 알고 싶은",
    description: "더 알고 싶거나 생각이 이어지는 문장이에요.",
    recordReasonPlaceholder: "예: 다음에 어떻게 풀릴지 궁금해서 적어 둔다…",
    thoughtsPlaceholder: "예: 어떤 의문이 생겼는지, 더 알고 싶은 점…",
  },
  {
    value: "amusing",
    label: "재미",
    hint: "즐겁거나 웃긴",
    description: "읽다가 즐겁거나 웃음·재미가 느껴지는 문장이에요.",
    recordReasonPlaceholder: "예: 웃기면서도 기억에 남아서 남긴다…",
    thoughtsPlaceholder: "예: 왜 재미있다고 느꼈는지, 어떤 장면이 떠오르는지…",
  },
  {
    value: "core",
    label: "핵심",
    hint: "작가의 메시지",
    description: "작가가 전하려는 메시지가 담긴 것 같을 때예요.",
    recordReasonPlaceholder: "예: 책의 핵심 메시지가 담긴 것 같아 저장한다…",
    thoughtsPlaceholder: "예: 작가가 전하려는 바가 무엇 같았는지…",
  },
  {
    value: "important",
    label: "중요",
    hint: "다시 볼 만한",
    description: "나중에 다시 봐야 할 만큼 중요하다고 느낄 때예요.",
    recordReasonPlaceholder: "예: 나중에 다시 꼭 보려고 남겨 둔다…",
    thoughtsPlaceholder: "예: 왜 중요하다고 느꼈는지, 다른 부분과 어떻게 연결되는지…",
  },
  {
    value: "connected",
    label: "연결",
    hint: "내 경험과 연결",
    description: "내 경험·삶과 바로 이어지는 문장이에요.",
    recordReasonPlaceholder: "예: 내 경험과 바로 이어져서 남긴다…",
    thoughtsPlaceholder: "예: 어떤 기억·상황이 떠올랐는지, 어떻게 맞닿는지…",
  },
  {
    value: "none",
    label: "선택 안 함",
    hint: "나중에 정리",
    description: "아직 분류하지 않았거나, 한 가지로만 정하기 어려울 때예요.",
    recordReasonPlaceholder: "예: 다음 장으로 이어지는 복선이라 저장해 두고 싶다…",
    thoughtsPlaceholder: "이 구절이 왜 인상 깊었는지, 어떤 생각이 들었는지 적어보세요…",
  },
]

const LEGACY_QUOTE_HIGHLIGHT_LABELS: Record<string, string> = {
  favorite_line: "애착 구절",
  memorable: "인상 깊은 구절",
  vocabulary: "표현·어휘",
  plot_turn: "전개·감정",
}

/** 질문이 무엇을 겨냥하는지(질문 유형 questionType과 별개) */
export type QuestionFocusKind =
  | "comprehension"
  | "interpretation"
  | "craft"
  | "connection"
  | "evaluation"
  | "open"
  | "none"

export const QUESTION_FOCUS_OPTIONS: ReadonlyArray<MetaSelectOption<QuestionFocusKind>> = [
  {
    value: "comprehension",
    label: "내용·사실",
    hint: "사건·정보 짚기",
    description: "무슨 일이 일어나는지, 인물·설정·정보를 정확히 짚고 싶을 때예요.",
    recordReasonPlaceholder:
      "예: 이 사건·설정이 맞는지, 앞뒤가 어떻게 이어지는지 궁금해서…",
  },
  {
    value: "interpretation",
    label: "해석·의미",
    hint: "왜·무슨 뜻인지",
    description:
      "왜 이렇게 썼는지, 상징·주제·문맥 속 의미를 더 깊게 헤아리고 싶을 때예요.",
    recordReasonPlaceholder:
      "예: 왜 이렇게 썼는지, 상징·주제가 무엇인지 더 헤아리고 싶어서…",
  },
  {
    value: "craft",
    label: "문장·구성",
    hint: "글쓰기·리듬",
    description:
      "리듬, 반복, 전환, 문장 길이 등 글쓰기·구성이 어떻게 효과를 내는지 보고 싶을 때예요.",
    recordReasonPlaceholder:
      "예: 문장 리듬·구성이 어떻게 효과를 내는지 알고 싶어서…",
  },
  {
    value: "connection",
    label: "연결·적용",
    hint: "삶·다른 책 연결",
    description: "내 경험, 다른 책, 뉴스·세상과 어떻게 맞닿는지 떠올리고 싶을 때예요.",
    recordReasonPlaceholder:
      "예: 내 삶·다른 책과 어떻게 맞닿는지 떠올리며…",
  },
  {
    value: "evaluation",
    label: "평가·비평",
    hint: "설득력·톤 판단",
    description:
      "설득력, 공정성, 톤 등 이 글이 나에게 어떻게 작동하는지 판단하고 싶을 때예요.",
    recordReasonPlaceholder:
      "예: 설득력이나 톤이 어떻게 느껴졌는지 정리하려고…",
  },
  {
    value: "open",
    label: "열린 질문",
    hint: "형식 없이 궁금",
    description: "위에 해당하기 어렵거나, 그냥 궁금한 것을 자유롭게 남기고 싶을 때예요.",
    recordReasonPlaceholder: "예: 형식 없이 떠오른 궁금증을 적어 둔다…",
  },
  {
    value: "none",
    label: "선택 안 함",
    hint: "나중에 정리",
    description: "초점을 정하지 않았거나, 나중에 정리해도 될 때예요.",
    recordReasonPlaceholder: "예: 앞 장과 모순되어 궁금해졌다…",
  },
]

export function quoteHighlightLabel(kind: string | undefined): string {
  if (!kind || kind === "none") return ""
  const o = QUOTE_HIGHLIGHT_OPTIONS.find((x) => x.value === kind)
  if (o) return o.label
  return LEGACY_QUOTE_HIGHLIGHT_LABELS[kind] ?? kind
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

function quoteHighlightOption(kind: string | undefined) {
  if (!kind || kind === "none") {
    return QUOTE_HIGHLIGHT_OPTIONS.find((x) => x.value === "none")
  }
  return (
    QUOTE_HIGHLIGHT_OPTIONS.find((x) => x.value === kind) ??
    QUOTE_HIGHLIGHT_OPTIONS.find((x) => x.value === "none")
  )
}

function questionFocusOption(kind: string | undefined) {
  if (!kind || kind === "none") {
    return QUESTION_FOCUS_OPTIONS.find((x) => x.value === "none")
  }
  return (
    QUESTION_FOCUS_OPTIONS.find((x) => x.value === kind) ??
    QUESTION_FOCUS_OPTIONS.find((x) => x.value === "none")
  )
}

export function quoteRecordReasonPlaceholder(kind: string | undefined): string {
  return quoteHighlightOption(kind)?.recordReasonPlaceholder ?? ""
}

export function quoteThoughtsPlaceholder(kind: string | undefined): string {
  return quoteHighlightOption(kind)?.thoughtsPlaceholder ?? ""
}

export function questionReasonPlaceholder(kind: string | undefined): string {
  return questionFocusOption(kind)?.recordReasonPlaceholder ?? ""
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

/** @deprecated 목적 태그 UI 제거 — 기존 generalThoughts 표시용으로만 유지 */
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
