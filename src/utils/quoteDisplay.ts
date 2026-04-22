/**
 * 구절 기록 표시용 유틸
 * generalThoughts에 저장된 목적(purpose) 영문 값을 한글로 매핑해 화면에만 사용
 */

import { QUOTE_PURPOSE_META } from "@/constants/readingMeta"

export const PURPOSE_LABELS: Record<string, string> = Object.fromEntries(
  QUOTE_PURPOSE_META.map((m) => [m.slug, m.label]),
)

/**
 * generalThoughts 원문에서 목적 태그를 한글로 치환해 표시용 문자열 반환.
 * 형식: "이유 / core_message, perspective_shift" → "이유 · 핵심 메시지, 시각 전환"
 * "none" 및 알 수 없는 slug는 노출하지 않음.
 */
export function formatGeneralThoughtsForDisplay(raw: string): string {
  if (!raw || typeof raw !== "string") return ""
  const s = raw.trim()
  const parts = s.split(/\s*\/\s*/)
  const reason = parts[0]?.trim() ?? ""
  const tagStr = parts.slice(1).join(" / ").trim()
  const tagLabels = tagStr
    ? tagStr
        .split(",")
        .map((t) => {
          const slug = t.trim().toLowerCase()
          if (slug === "none") return ""
          return PURPOSE_LABELS[slug] ?? ""
        })
        .filter(Boolean)
    : []
  const tagsDisplay = tagLabels.join(", ")
  if (reason && tagsDisplay) return `${reason} · ${tagsDisplay}`
  if (reason) return reason
  return tagsDisplay
}
