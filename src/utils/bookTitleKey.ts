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
