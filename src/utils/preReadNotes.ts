import type { Book } from "@/types/book"

type PreReadFields = Pick<
  Book,
  "preReadExpectation" | "preReadWhatToGain" | "preReadInterestConnection"
>

export function isPreReadNotesEmpty(book: PreReadFields): boolean {
  const a = (book.preReadExpectation ?? "").trim()
  const b = (book.preReadWhatToGain ?? "").trim()
  const c = (book.preReadInterestConnection ?? "").trim()
  return !a && !b && !c
}

/** 세 칸 중 내용이 있는 칸 개수 (0~3) */
export function countPreReadFieldsFilled(book: PreReadFields): number {
  let n = 0
  if ((book.preReadExpectation ?? "").trim()) n += 1
  if ((book.preReadWhatToGain ?? "").trim()) n += 1
  if ((book.preReadInterestConnection ?? "").trim()) n += 1
  return n
}

/** 입력된 칸만 줄바꿈으로 이어 붙인 미리보기(저널 카드 등) */
export function preReadNotesJoinedBody(book: PreReadFields): string {
  return [book.preReadExpectation, book.preReadWhatToGain, book.preReadInterestConnection]
    .map((s) => (s ?? "").trim())
    .filter(Boolean)
    .join("\n\n")
}

export function preReadNotesPreview(book: {
  preReadExpectation?: string
  preReadWhatToGain?: string
  preReadInterestConnection?: string
}): string {
  const parts = [
    book.preReadExpectation,
    book.preReadWhatToGain,
    book.preReadInterestConnection,
  ]
    .map((s) => (s ?? "").trim())
    .filter(Boolean)
  const joined = parts.join(" · ")
  if (joined.length <= 100) return joined
  return `${joined.slice(0, 97)}…`
}
