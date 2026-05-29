/** 서재 목록 카드: 분야 한 줄 최대 글자 수(초과 시 …) */
export const LIBRARY_CARD_CATEGORY_MAX_CHARS = 28

/** `2007-12-15` → `2007` (연도만, 없으면 앞부분 그대로) */
export function formatBookPublishedLabel(
  publishedDate?: string,
): string | null {
  const raw = publishedDate?.trim()
  if (!raw) return null
  const year = raw.match(/^(\d{4})/)?.[1]
  if (year) return year
  return raw.length > 12 ? `${raw.slice(0, 12)}…` : raw
}

export function formatBookCategoryLine(
  depth1Label?: string,
  depth2Label?: string,
): string | null {
  const d1 = depth1Label?.trim()
  const d2 = depth2Label?.trim()
  if (d1 && d2) return `${d1} › ${d2}`
  if (d1) return d1
  if (d2) return d2
  return null
}

export function truncateLibraryCardCategory(
  text: string,
  maxChars = LIBRARY_CARD_CATEGORY_MAX_CHARS,
): string {
  if (text.length <= maxChars) return text
  return `${text.slice(0, maxChars - 1)}…`
}
