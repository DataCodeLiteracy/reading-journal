/**
 * 텍스트 유사도 계산 유틸리티
 * 단답형 문제 자동 채점에 사용
 */

/**
 * 한국어 텍스트 정규화
 * - 공백, 특수문자 제거
 * - 조사 제거 (은/는/이/가/을/를/의/에/로/와/과 등)
 * - 소문자 변환
 */
export function normalizeKoreanText(text: string): string {
  if (!text) return ""
  
  let normalized = text
    .toLowerCase()
    .trim()
    // 공백 정규화
    .replace(/\s+/g, "")
    // 특수문자 제거
    .replace(/[.,!?;:'"()[\]{}~`@#$%^&*+=<>\/\\|-]/g, "")
    // 일반적인 조사 제거 (끝에 오는 경우)
    .replace(/(입니다|습니다|이다|예요|에요|이에요|이요)$/g, "")
    .replace(/(은|는|이|가|을|를|의|에|로|와|과|도|만|까지|부터|에서|으로|라고|이라고)$/g, "")
  
  return normalized
}

/**
 * 레벤슈타인 거리 계산
 * 두 문자열 사이의 편집 거리
 */
export function levenshteinDistance(str1: string, str2: string): number {
  const m = str1.length
  const n = str2.length
  
  if (m === 0) return n
  if (n === 0) return m
  
  const dp: number[][] = Array(m + 1)
    .fill(null)
    .map(() => Array(n + 1).fill(0))
  
  for (let i = 0; i <= m; i++) dp[i][0] = i
  for (let j = 0; j <= n; j++) dp[0][j] = j
  
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1]
      } else {
        dp[i][j] = 1 + Math.min(
          dp[i - 1][j],     // 삭제
          dp[i][j - 1],     // 삽입
          dp[i - 1][j - 1]  // 교체
        )
      }
    }
  }
  
  return dp[m][n]
}

/**
 * 레벤슈타인 유사도 (0-1)
 */
export function levenshteinSimilarity(str1: string, str2: string): number {
  const maxLen = Math.max(str1.length, str2.length)
  if (maxLen === 0) return 1
  
  const distance = levenshteinDistance(str1, str2)
  return 1 - distance / maxLen
}

/**
 * 자카드 유사도 (단어/문자 집합 기반)
 */
export function jaccardSimilarity(str1: string, str2: string): number {
  const set1 = new Set(str1.split(""))
  const set2 = new Set(str2.split(""))
  
  const intersection = new Set([...set1].filter(x => set2.has(x)))
  const union = new Set([...set1, ...set2])
  
  if (union.size === 0) return 1
  return intersection.size / union.size
}

/**
 * 키워드 포함 여부 확인
 * 정답의 주요 단어들이 사용자 답안에 포함되어 있는지 확인
 */
export function containsKeywords(answer: string, userAnswer: string): number {
  const normalizedAnswer = normalizeKoreanText(answer)
  const normalizedUser = normalizeKoreanText(userAnswer)
  
  // 정답이 사용자 답안에 포함되어 있으면 100%
  if (normalizedUser.includes(normalizedAnswer)) return 1
  
  // 사용자 답안이 정답에 포함되어 있으면 90%
  if (normalizedAnswer.includes(normalizedUser)) return 0.9
  
  // 2글자 이상 연속 일치 비율 계산
  let matchCount = 0
  for (let i = 0; i < normalizedAnswer.length - 1; i++) {
    const substr = normalizedAnswer.substring(i, i + 2)
    if (normalizedUser.includes(substr)) {
      matchCount++
    }
  }
  
  const maxPossible = Math.max(normalizedAnswer.length - 1, 1)
  return matchCount / maxPossible
}

/**
 * 종합 유사도 계산 (단답형용)
 * 여러 알고리즘을 조합하여 최종 유사도 산출
 */
export function calculateShortAnswerSimilarity(
  correctAnswer: string,
  userAnswer: string
): { similarity: number; isCorrect: boolean; method: string } {
  if (!userAnswer.trim()) {
    return { similarity: 0, isCorrect: false, method: "empty" }
  }
  
  const normalizedCorrect = normalizeKoreanText(correctAnswer)
  const normalizedUser = normalizeKoreanText(userAnswer)
  
  // 정규화 후 정확히 일치
  if (normalizedCorrect === normalizedUser) {
    return { similarity: 1, isCorrect: true, method: "exact" }
  }
  
  // 레벤슈타인 유사도
  const levSim = levenshteinSimilarity(normalizedCorrect, normalizedUser)
  
  // 키워드 포함 유사도
  const keywordSim = containsKeywords(correctAnswer, userAnswer)
  
  // 자카드 유사도
  const jaccardSim = jaccardSimilarity(normalizedCorrect, normalizedUser)
  
  // 가중 평균 (레벤슈타인 40%, 키워드 40%, 자카드 20%)
  const combinedSimilarity = levSim * 0.4 + keywordSim * 0.4 + jaccardSim * 0.2
  
  // 임계값 설정: 75% 이상이면 정답으로 판정
  const THRESHOLD = 0.75
  const isCorrect = combinedSimilarity >= THRESHOLD
  
  let method = "combined"
  if (levSim >= 0.85) method = "levenshtein"
  else if (keywordSim >= 0.9) method = "keyword"
  
  return {
    similarity: Math.round(combinedSimilarity * 100) / 100,
    isCorrect,
    method,
  }
}

/**
 * 단답형 채점 결과
 */
export interface ShortAnswerGradingResult {
  similarity: number
  isCorrect: boolean
  method: string
  needsReview: boolean // 유사도가 애매한 경우 (50-75%)
}

/**
 * 단답형 문제 채점
 */
export function gradeShortAnswer(
  correctAnswer: string,
  userAnswer: string
): ShortAnswerGradingResult {
  const result = calculateShortAnswerSimilarity(correctAnswer, userAnswer)
  
  // 유사도 50-75% 사이면 사용자 확인 권장
  const needsReview = result.similarity >= 0.5 && result.similarity < 0.75
  
  return {
    ...result,
    needsReview,
  }
}
