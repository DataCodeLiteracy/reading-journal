/**
 * 경험치 및 레벨 시스템
 * 독서 시간을 경험치로 변환하고 레벨을 계산합니다.
 */

// 1초 독서 = 1 경험치 (필요시 조정 가능)
export const READING_TIME_TO_EXP_RATIO = 1

// 레벨업에 필요한 경험치 계산 함수
// 레벨 N에 도달하려면: baseExp * (level - 1) * levelMultiplier
// 조정: 레벨 100이 약 2만 5천~3만 시간 분량(독서 시간 + 좋아요/댓글 보너스)이 되도록 설정
const BASE_EXP = 800 // 기본 경험치 (레벨 1->2에 필요한 경험치)
const LEVEL_MULTIPLIER = 1.1 // 레벨이 올라갈수록 필요한 경험치 증가율

/**
 * 특정 레벨에 도달하기 위해 필요한 총 경험치 계산
 * @param level 목표 레벨
 * @returns 필요한 총 경험치
 */
export function getExpRequiredForLevel(level: number): number {
  if (level <= 1) return 0

  // 레벨 1 -> 2: 800 EXP
  // 레벨 2 -> 3: 880 EXP
  // 레벨 3 -> 4: 968 EXP
  // ...
  // 총 경험치 = BASE_EXP * (1 + 1.1 + 1.1^2 + ... + 1.1^(level-2))
  let totalExp = 0
  for (let i = 0; i < level - 1; i++) {
    totalExp += BASE_EXP * Math.pow(LEVEL_MULTIPLIER, i)
  }

  return Math.floor(totalExp)
}

/**
 * 현재 경험치로 레벨 계산
 * @param experience 총 경험치
 * @returns 현재 레벨
 */
export function calculateLevel(experience: number): number {
  if (experience < 0) return 1

  let level = 1
  let requiredExp = getExpRequiredForLevel(level + 1)

  while (experience >= requiredExp) {
    level++
    requiredExp = getExpRequiredForLevel(level + 1)
  }

  return level
}

/**
 * 현재 레벨에서 다음 레벨까지 필요한 경험치 계산
 * @param currentLevel 현재 레벨
 * @returns 다음 레벨까지 필요한 경험치
 */
export function getExpToNextLevel(currentLevel: number): number {
  const currentLevelExp = getExpRequiredForLevel(currentLevel)
  const nextLevelExp = getExpRequiredForLevel(currentLevel + 1)
  return nextLevelExp - currentLevelExp
}

/**
 * 현재 레벨에서의 경험치 진행률 계산 (0-100)
 * @param experience 총 경험치
 * @param currentLevel 현재 레벨
 * @returns 진행률 (0-100)
 */
export function getLevelProgress(
  experience: number,
  currentLevel: number
): number {
  const currentLevelExp = getExpRequiredForLevel(currentLevel)
  const nextLevelExp = getExpRequiredForLevel(currentLevel + 1)
  const expInCurrentLevel = experience - currentLevelExp
  const expNeededForNextLevel = nextLevelExp - currentLevelExp

  if (expNeededForNextLevel === 0) return 100

  const progress = (expInCurrentLevel / expNeededForNextLevel) * 100
  return Math.min(100, Math.max(0, Math.round(progress)))
}

/**
 * 독서 시간(초)을 경험치로 변환
 * @param readingTimeSeconds 독서 시간 (초)
 * @returns 경험치
 */
export function readingTimeToExperience(readingTimeSeconds: number): number {
  return Math.floor(readingTimeSeconds * READING_TIME_TO_EXP_RATIO)
}

/**
 * 경험치를 독서 시간(초)로 변환
 * @param experience 경험치
 * @returns 독서 시간 (초)
 */
export function experienceToReadingTime(experience: number): number {
  return Math.floor(experience / READING_TIME_TO_EXP_RATIO)
}

/**
 * 총 경험치와 레벨 정보 계산
 * @param totalReadingTime 총 독서 시간 (초)
 * @param bonusExperience 보너스 경험치 (좋아요, 댓글 등)
 * @returns 레벨 정보 객체
 */
export function calculateLevelInfo(
  totalReadingTime: number,
  bonusExperience: number = 0
) {
  const readingExp = readingTimeToExperience(totalReadingTime)
  const totalExperience = readingExp + bonusExperience
  const level = calculateLevel(totalExperience)
  const expToNextLevel = getExpToNextLevel(level)
  const progress = getLevelProgress(totalExperience, level)

  return {
    level,
    experience: totalExperience,
    readingExperience: readingExp,
    bonusExperience,
    expToNextLevel,
    progress,
    expRequiredForCurrentLevel: getExpRequiredForLevel(level),
    expRequiredForNextLevel: getExpRequiredForLevel(level + 1),
  }
}

/**
 * 레벨 정보 타입
 */
export interface LevelInfo {
  level: number
  experience: number
  readingExperience: number
  bonusExperience: number
  expToNextLevel: number
  progress: number
  expRequiredForCurrentLevel: number
  expRequiredForNextLevel: number
}

