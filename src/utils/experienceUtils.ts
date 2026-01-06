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

