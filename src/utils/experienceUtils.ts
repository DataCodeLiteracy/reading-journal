/**
 * 경험치 표시 유틸.
 * 저장값은 소수 1자리까지 유지하고, UI에서는 반올림(÷100 스케일)만 보여 준다.
 */

/**
 * 경험치를 표시용으로 변환 (100으로 나누고 반올림)
 * 실제 저장된 경험치는 그대로 유지하고, 표시만 변경
 */
export function formatDisplayExperience(experience: number): number {
  return Math.round(experience / 100)
}

/**
 * 경험치를 표시용 문자열로 변환
 */
export function formatDisplayExperienceString(experience: number): string {
  return formatDisplayExperience(experience).toLocaleString()
}

/**
 * 세션 보너스 등 원시 EXP 숫자를 화면용으로 반올림
 * (저장/누적은 소수 유지, 표시만 정수)
 */
export function formatRoundedExperience(experience: number): number {
  return Math.round(experience)
}

export function formatRoundedExperienceString(experience: number): string {
  return formatRoundedExperience(experience).toLocaleString()
}
