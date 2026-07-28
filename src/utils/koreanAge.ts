/** 한국 나이(세는 나이): 출생 연도 기준, 현재 연도 - 출생 연도 + 1 */
export function koreanAgeFromBirthYear(
  birthYear: number,
  referenceYear: number = new Date().getFullYear(),
): number {
  return referenceYear - birthYear + 1
}

/** 보호자(자녀 연결·읽어주기) 기능을 쓸 수 있는 최소 한국 나이 */
export const GUARDIAN_MIN_KOREAN_AGE = 22

export function canLinkChildren(
  birthYear: number | null | undefined,
  referenceYear: number = new Date().getFullYear(),
): boolean {
  if (birthYear == null || !Number.isFinite(birthYear) || birthYear <= 0) {
    return false
  }
  return koreanAgeFromBirthYear(birthYear, referenceYear) >= GUARDIAN_MIN_KOREAN_AGE
}

export function formatBirthYearWithKoreanAge(
  birthYear: number,
  referenceYear: number = new Date().getFullYear(),
): string {
  const age = koreanAgeFromBirthYear(birthYear, referenceYear)
  return `${birthYear}년생 · 한국 나이 ${age}세`
}

export function birthYearOptions(
  fromYear: number = new Date().getFullYear(),
  toYear: number = 1940,
): number[] {
  const years: number[] = []
  for (let y = fromYear; y >= toYear; y -= 1) {
    years.push(y)
  }
  return years
}
