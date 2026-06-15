/**
 * 내 서재에서 같은 책으로 취급할 제목 키.
 * - 앞뒤·중간의 모든 공백(일반 공백, 탭, 전각 공백 등 `\s`) 제거
 * - 영문은 소문자로 통일
 *
 * 예: "유시민의 글쓰기 특강" 과 "유시민의 글쓰기특강" 은 동일 키.
 */
export function normalizeBookTitleKey(title: string): string {
  return title.replace(/\s+/g, "").toLowerCase()
}

/** 출판사 비교용 키 (공백 제거·소문자). 미입력은 빈 문자열. */
export function normalizePublisherKey(publisher?: string): string {
  const p = (publisher ?? "").trim()
  if (!p) return ""
  return p.replace(/\s+/g, "").toLowerCase()
}

/**
 * 내 서재 중복 판별 키 — 제목 + 출판사.
 * 출판사가 다르면 같은 제목이라도 다른 책으로 취급합니다.
 */
export function normalizeBookDuplicateKey(
  title: string,
  publisher?: string,
): string {
  return `${normalizeBookTitleKey(title)}|${normalizePublisherKey(publisher)}`
}

export function isSameBookEdition(
  a: { title: string; publisher?: string },
  b: { title: string; publisher?: string },
): boolean {
  return (
    normalizeBookDuplicateKey(a.title, a.publisher) ===
    normalizeBookDuplicateKey(b.title, b.publisher)
  )
}
