/** 숫자만 추출 (최대 11자리, 휴대폰) */
export function phoneDigitsOnly(value: string, maxLength = 11): string {
  return value.replace(/\D/g, "").slice(0, maxLength)
}

/** 010-0000-0000 형식으로 자동 포맷 */
export function formatKoreanMobilePhone(value: string): string {
  const digits = phoneDigitsOnly(value)
  if (digits.length <= 3) return digits
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`
}

/**
 * 입력 필드용: 숫자는 자동 포맷, `-`는 3·7자리 직후(010-|010-1234-)에서만 허용
 */
export function formatKoreanMobilePhoneInput(value: string): string {
  const digits = phoneDigitsOnly(value, 11)
  const formatted = formatKoreanMobilePhone(digits)

  if (!value.endsWith("-")) return formatted

  if (digits.length === 3) return `${digits}-`
  if (digits.length === 7) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-`
  }

  return formatted
}
