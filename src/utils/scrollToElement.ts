export const BOOK_HERO_READING_TIME_ID = "book-hero-total-reading-time"
export const BOOK_READING_SESSIONS_SECTION_ID = "book-reading-sessions-section"

export function scrollToElementId(id: string): void {
  const el = document.getElementById(id)
  if (!el) return
  el.scrollIntoView({ behavior: "smooth", block: "center" })
}

/** 제목 옆 «총 3시간 20분» — 초는 생략 */
export function formatTotalReadingTimeCompact(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  if (hours > 0) return `${hours}시간 ${minutes}분`
  if (minutes > 0) return `${minutes}분`
  return `${totalSeconds}초`
}
