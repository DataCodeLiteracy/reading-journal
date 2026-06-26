import { CanonicalBookService } from "@/services/canonicalBookService"
import { ReadingContentPackService } from "@/services/readingContentPackService"
import type { ReadingContentPack } from "@/types/readingContent"

export type ExploreEditionHighlights = {
  hasToc: boolean
  tocChapterCount: number
  hasReadingExam: boolean
  examQuestionCount: number
  hasReadingExcerpt: boolean
  excerptChapterCount: number
}

function countExamQuestions(pack: ReadingContentPack | null): number {
  if (!pack?.examAssessmentData?.length) return 0
  return pack.examAssessmentData.reduce(
    (sum, block) => sum + (block.quizzes?.length ?? 0),
    0,
  )
}

export async function fetchExploreEditionHighlights(
  title: string,
  canonicalBookId?: string,
): Promise<ExploreEditionHighlights> {
  const [canonical, pack] = await Promise.all([
    canonicalBookId
      ? CanonicalBookService.getById(canonicalBookId)
      : Promise.resolve(null),
    ReadingContentPackService.getForBook({
      title,
      canonicalBookId,
    }),
  ])

  const tocChapterCount = canonical?.tocOutline?.length ?? 0
  const examQuestionCount = countExamQuestions(pack)
  const excerptChapterCount = pack?.excerptChapterSummaries?.length ?? 0

  return {
    hasToc: tocChapterCount > 0,
    tocChapterCount,
    hasReadingExam: examQuestionCount > 0,
    examQuestionCount,
    hasReadingExcerpt: excerptChapterCount > 0,
    excerptChapterCount,
  }
}

export async function fetchExploreHighlightsForGroups(
  groups: readonly {
    groupKey: string
    title: string
    books: readonly { canonicalBookId?: string }[]
  }[],
): Promise<Record<string, ExploreEditionHighlights>> {
  const entries = await Promise.all(
    groups.map(async (g) => {
      const canonicalBookId = g.books.find((b) => b.canonicalBookId)
        ?.canonicalBookId
      const highlights = await fetchExploreEditionHighlights(
        g.title,
        canonicalBookId,
      )
      return [g.groupKey, highlights] as const
    }),
  )
  return Object.fromEntries(entries)
}
