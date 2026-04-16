import type { ReadingExamRangeBlock } from "@/types/readingContent"

export function totalExamQuestionCount(
  blocks: ReadingExamRangeBlock[] | undefined
): number {
  if (!blocks?.length) return 0
  return blocks.reduce((s, b) => s + (b.quizzes?.length ?? 0), 0)
}

export function gradedExamCount(
  grades: Record<number, unknown> | undefined,
  blocks: ReadingExamRangeBlock[] | undefined
): number {
  if (!grades || !blocks) return 0
  const g = grades as Record<string, unknown>
  const nums = new Set<number>()
  for (const b of blocks) {
    for (const q of b.quizzes ?? []) {
      const n = q.question_number
      if (g[String(n)] != null) nums.add(n)
    }
  }
  return nums.size
}

export function prevExamCoords(
  blocks: ReadingExamRangeBlock[],
  rangeIndex: number,
  qIndex: number
): { rangeIndex: number; qIndex: number } | null {
  if (qIndex > 0) return { rangeIndex, qIndex: qIndex - 1 }
  if (rangeIndex <= 0) return null
  const prevBlock = blocks[rangeIndex - 1]
  const len = prevBlock?.quizzes?.length ?? 0
  if (len === 0) return null
  return { rangeIndex: rangeIndex - 1, qIndex: len - 1 }
}

export function nextExamCoords(
  blocks: ReadingExamRangeBlock[],
  rangeIndex: number,
  qIndex: number
): { rangeIndex: number; qIndex: number } | null {
  const cur = blocks[rangeIndex]
  const len = cur?.quizzes?.length ?? 0
  if (qIndex + 1 < len) return { rangeIndex, qIndex: qIndex + 1 }
  if (rangeIndex + 1 >= blocks.length) return null
  return { rangeIndex: rangeIndex + 1, qIndex: 0 }
}
