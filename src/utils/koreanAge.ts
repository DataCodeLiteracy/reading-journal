/** 한국 나이(세는 나이): 출생 연도 기준, 현재 연도 - 출생 연도 + 1 */
export function koreanAgeFromBirthYear(
  birthYear: number,
  referenceYear: number = new Date().getFullYear(),
): number {
  return referenceYear - birthYear + 1
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
