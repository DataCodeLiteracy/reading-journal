import { decodeHtmlEntities } from "@/utils/decodeHtmlEntities"

/** API 응답의 HTML 태그 제거 (카카오 검색 title 등) */
export function stripHtmlTags(text: string): string {
  if (!text) return text
  return decodeHtmlEntities(text.replace(/<[^>]+>/g, "")).trim()
}
