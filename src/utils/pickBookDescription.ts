import { stripHtmlTags } from "@/utils/stripHtmlTags"

/** 검색 API가 본문 중간부터 잘라 준 발췌문인지 (앞 문장이 빠진 경우) */
export function looksLikeSearchSnippet(text: string): boolean {
  const t = text.trim()
  if (!t) return false
  if (/^\.\.\.|^…/.test(t)) return true
  // 문장 처음이 아닌, 접속·조사·연결 어미로 이어지는 경우
  return /^(것이며|하며|이며|이고|거나|인데|으며|라고|라는|하는|있는|없는|되어|되며|에서|에게|보다|처럼|따라|위해|통해|대해|관해|뿐만|뿐|으로|로서|라서|니까|면서|면서도|이나|든지)/.test(
    t,
  )
}

/** 비고(소개)에 넣을 설명 선택 — 완전한 문장 우선, 발췌문만 있으면 비움 */
export function pickBookDescription(
  ...candidates: (string | undefined)[]
): string | undefined {
  const cleaned = candidates
    .map((c) => stripHtmlTags(c?.trim() ?? ""))
    .filter((c) => c.length > 0)

  const complete = cleaned.filter((c) => !looksLikeSearchSnippet(c))
  if (complete.length === 0) return undefined

  return complete.reduce((best, cur) => (cur.length > best.length ? cur : best))
}
