/**
 * 알라딘 API 저자 문자열 → 폼용 저자명
 * - "(지은이)" 앞 이름만 추출
 * - "(그림)" 등 다른 역할 구간은 제외
 * - 여러 명이면 ", "로 연결
 *
 * 예: "최민준 (지은이), 홍길동 (그림), 김철수 (지은이)" → "최민준, 김철수"
 */
export function parseAladinAuthor(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed) return ""

  const segments = trimmed.split(/\s*[,;]\s*/).filter(Boolean)
  const names: string[] = []

  for (const segment of segments) {
    const name = extractAuthorNameFromSegment(segment.trim())
    if (name) names.push(name)
  }

  return names.join(", ")
}

function extractAuthorNameFromSegment(segment: string): string {
  if (!segment) return ""

  if (/\(그림\)|（그림）/.test(segment)) return ""

  const jieunyi = segment.match(/^(.+?)\s*[(（]지은이[)）]\s*$/u)
  if (jieunyi) {
    return jieunyi[1].trim()
  }

  if (/[(（][^)）]+[)）]/.test(segment)) {
    return ""
  }

  return segment
}
