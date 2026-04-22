/**
 * 완독 직후: 핵심 메시지 → 구절 기록 → 독서 질문 순으로 유도할 때
 * sessionStorage 로 단계를 둡니다. (새로고침·뒤로가기와 무관하게 이어짐)
 */

const key = (bookId: string) => `rj:postCompleteReading:${bookId}`

export type PostCompleteReadingStage = "excerpt" | "quotes" | "questions"

export function startPostCompleteReadingFlow(bookId: string): void {
  try {
    sessionStorage.setItem(key(bookId), "excerpt")
  } catch {
    /* ignore */
  }
}

export function getPostCompleteReadingStage(
  bookId: string,
): PostCompleteReadingStage | null {
  try {
    const v = sessionStorage.getItem(key(bookId))
    if (v === "excerpt" || v === "quotes" || v === "questions") return v
  } catch {
    /* ignore */
  }
  return null
}

export function setPostCompleteReadingStage(
  bookId: string,
  stage: PostCompleteReadingStage,
): void {
  try {
    sessionStorage.setItem(key(bookId), stage)
  } catch {
    /* ignore */
  }
}

export function clearPostCompleteReadingFlow(bookId: string): void {
  try {
    sessionStorage.removeItem(key(bookId))
  } catch {
    /* ignore */
  }
}
