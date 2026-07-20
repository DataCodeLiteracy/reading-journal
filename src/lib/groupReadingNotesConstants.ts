import type { GroupReadingNoteType } from "@/types/readingGroup"

export const GROUP_READING_NOTES_PAGE_SIZE = 10
export const GROUP_READING_NOTES_PREVIEW_SIZE = 2

export const GROUP_READING_NOTE_TYPE_LABEL: Record<GroupReadingNoteType, string> =
  {
    quote: "구절",
    question: "질문",
    review: "리뷰",
    critique: "서평",
  }

export const GROUP_READING_NOTE_TYPE_BADGE: Record<GroupReadingNoteType, string> =
  {
    quote:
      "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100",
    question:
      "bg-blue-100 text-blue-900 dark:bg-blue-900/40 dark:text-blue-100",
    review:
      "bg-violet-100 text-violet-900 dark:bg-violet-900/40 dark:text-violet-100",
    critique:
      "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100",
  }

export const GROUP_READING_NOTE_TYPES: GroupReadingNoteType[] = [
  "quote",
  "question",
  "review",
  "critique",
]
