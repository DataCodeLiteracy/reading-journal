/** 알라딘 API 등 HTML 엔티티로 인코딩된 문자열을 일반 텍스트로 복원 */
export function decodeHtmlEntities(text: string): string {
  if (!text) return text

  let out = text
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")

  out = out.replace(/&#(\d+);/g, (_, num: string) => {
    const code = Number.parseInt(num, 10)
    return code >= 0 && code <= 0x10ffff ? String.fromCodePoint(code) : `&#${num};`
  })

  out = out.replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => {
    const code = Number.parseInt(hex, 16)
    return code >= 0 && code <= 0x10ffff ? String.fromCodePoint(code) : `&#x${hex};`
  })

  return out
}
