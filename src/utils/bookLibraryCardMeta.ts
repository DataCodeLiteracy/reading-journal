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

/** `2007-12-15` → `2007년 12월 15일` (연·월·일 표시) */
export function formatBookPublishedFullLabel(
  publishedDate?: string,
): string | null {
  const raw = publishedDate?.trim()
  if (!raw) return null

  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (iso) {
    const [, y, m, d] = iso
    return `${y}년 ${Number(m)}월 ${Number(d)}일`
  }

  const compact = raw.match(/^(\d{4})(\d{2})(\d{2})$/)
  if (compact) {
    const [, y, m, d] = compact
    return `${y}년 ${Number(m)}월 ${Number(d)}일`
  }

  const yearMonth = raw.match(/^(\d{4})-(\d{2})$/)
  if (yearMonth) {
    return `${yearMonth[1]}년 ${Number(yearMonth[2])}월`
  }

  const yearOnly = raw.match(/^(\d{4})$/)
  if (yearOnly) return `${yearOnly[1]}년`

  const year = raw.match(/^(\d{4})/)?.[1]
  if (year) return year
  return raw.length > 16 ? `${raw.slice(0, 16)}…` : raw
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
