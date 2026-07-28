import type { Book } from "@/types/book"

/** 책 설정 기본값: 미설정이면 on */
export function isBookTimerPreReadPromptEnabled(
  book: Pick<Book, "timerPreReadPromptEnabled"> | null | undefined,
): boolean {
  return book?.timerPreReadPromptEnabled !== false
}

export function isBookTimerReadAloudEnabled(
  book: Pick<Book, "timerReadAloudEnabled"> | null | undefined,
): boolean {
  return book?.timerReadAloudEnabled !== false
}
