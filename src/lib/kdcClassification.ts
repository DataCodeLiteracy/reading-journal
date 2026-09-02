import kdcLabels from "@/data/kdc-labels.json"
import type { BookKdcClassification } from "@/types/bookClassification"

const MAJORS = kdcLabels.majors as Record<string, string>
const MIDDLES = kdcLabels.middles as Record<string, string>

/** 청구기호 등에서 KDC 세부번호 추출 (예: "181.7-아74ㅎ" → 181.7) */
export function parseKdcDetailFromCallNo(callNo: string): number | null {
  const match = callNo.trim().match(/\b(\d{3}(?:\.\d+)?)\b/)
  if (!match) return null
  const n = Number.parseFloat(match[1])
  return Number.isFinite(n) ? n : null
}

export function kdcMajorCodeFromDetail(detail: number): string {
  const major = Math.floor(detail / 100) * 100
  return String(major).padStart(3, "0")
}

export function kdcMiddleCodeFromDetail(detail: number): string {
  const middle = Math.floor(detail / 10) * 10
  return String(middle).padStart(3, "0")
}

/** 181.7 등 → 소수 이하(소분류) 제외한 정수 코드 "181" */
export function formatKdcDetailCode(detail: number): string {
  return String(Math.floor(detail))
}

export function normalizeKdcDetailCode(
  raw: string | number | null | undefined,
): string | undefined {
  if (raw == null) return undefined
  const n =
    typeof raw === "number" ? raw : Number.parseFloat(String(raw).trim())
  if (!Number.isFinite(n) || n < 0) return undefined
  return formatKdcDetailCode(n)
}

export function resolveKdcMajorLabel(code: string): string | undefined {
  const normalized = code.trim().padStart(3, "0")
  return MAJORS[normalized]
}

export function resolveKdcMiddleLabel(code: string): string | undefined {
  const normalized = code.trim().padStart(3, "0")
  return MIDDLES[normalized]
}

export function listKdcMajorOptions(): { code: string; label: string }[] {
  return Object.entries(MAJORS)
    .map(([code, label]) => ({ code, label }))
    .sort((a, b) => a.code.localeCompare(b.code))
}

export function listKdcMiddleOptionsForMajor(
  majorCode: string,
): { code: string; label: string }[] {
  const major = Number.parseInt(majorCode.trim().padStart(3, "0"), 10)
  if (!Number.isFinite(major)) return []

  return Object.entries(MIDDLES)
    .filter(([code]) => {
      const middle = Number.parseInt(code, 10)
      return middle >= major && middle < major + 100
    })
    .map(([code, label]) => ({ code, label }))
    .sort((a, b) => a.code.localeCompare(b.code))
}

export function normalizeKdcMajorCode(
  raw: string | undefined,
  detail?: number,
): string | undefined {
  if (Number.isFinite(detail)) {
    return kdcMajorCodeFromDetail(detail!)
  }

  if (!raw?.trim()) return undefined
  const padded = raw.trim().padStart(3, "0")
  if (MAJORS[padded]) return padded

  const n = Number.parseInt(padded, 10)
  if (!Number.isFinite(n)) return undefined

  // NLK kdc_code_1s "001" (= 대분류 1) → KDC "100"
  if (n >= 1 && n <= 9) {
    const fromClass = String(n * 100).padStart(3, "0")
    if (MAJORS[fromClass]) return fromClass
  }

  const hundreds = Math.floor(n / 100) * 100
  const fromHundreds = String(hundreds).padStart(3, "0")
  if (MAJORS[fromHundreds]) return fromHundreds

  return undefined
}

export function buildKdcClassification(params: {
  majorCode?: string
  majorLabel?: string
  callNo?: string
  kdcDetail?: string
}): BookKdcClassification {
  const result: BookKdcClassification = {}

  const detailRaw =
    params.kdcDetail?.trim() ||
    (params.callNo ? parseKdcDetailFromCallNo(params.callNo) : null)
  const detail =
    typeof detailRaw === "number"
      ? detailRaw
      : detailRaw
        ? Number.parseFloat(detailRaw)
        : NaN

  if (Number.isFinite(detail)) {
    const majorCode = kdcMajorCodeFromDetail(detail)
    const middleCode = kdcMiddleCodeFromDetail(detail)
    result.kdcMajorCode = majorCode
    result.kdcMajorLabel = resolveKdcMajorLabel(majorCode)
    result.kdcMiddleCode = middleCode
    result.kdcMiddleLabel = resolveKdcMiddleLabel(middleCode)
    result.kdcDetailCode = formatKdcDetailCode(detail)
    const apiLabel = params.majorLabel?.trim()
    if (apiLabel && !result.kdcMajorLabel) {
      result.kdcMajorLabel = apiLabel
    }
    return result
  }

  const majorCode = normalizeKdcMajorCode(params.majorCode)
  if (majorCode) {
    result.kdcMajorCode = majorCode
    result.kdcMajorLabel =
      params.majorLabel?.trim() ||
      resolveKdcMajorLabel(majorCode) ||
      undefined
  }

  return result
}

/** 주제 문자열 → subjects 배열 (구분자·괄호 처리) */
export function parseSubjectTerms(raw: string | undefined): string[] {
  if (!raw?.trim()) return []

  const normalized = raw
    .replace(/\[.*?\]/g, " ")
    .replace(/[／/|]/g, ",")
    .replace(/\s+/g, " ")
    .trim()

  const parts = normalized
    .split(/[,;·]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .filter((s) => s.length >= 2)
    .filter((s) => !/^\d{1,3}(\.\d+)?$/.test(s))

  return [...new Set(parts)]
}

export function formatKdcDisplay(
  classification: BookKdcClassification,
): string | undefined {
  const major = classification.kdcMajorLabel?.trim()
  const middle = classification.kdcMiddleLabel?.trim()
  if (major && middle) return `${major} / ${middle}`
  return major || middle || undefined
}
