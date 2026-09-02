/**
 * 도서 API 저자 필드 → 폼용 저자명
 * - 카카오: string[]
 * - 알라딘 등: "(지은이)" 형식 문자열도 처리
 */
export function formatBookAuthors(authors: string[] | string): string {
  if (Array.isArray(authors)) {
    return authors.map((a) => a.trim()).filter(Boolean).join(", ")
  }
  return parseLegacyAuthorString(authors)
}

function parseLegacyAuthorString(raw: string): string {
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
