/**
 * 발췌 챕터 인덱스별 키워드 텍스트 색 (라이트·다크, 고정 순환)
 * 챕터가 N개를 넘으면 첫 색부터 다시 순서대로 할당.
 */
const PALETTE = [
  "text-sky-600 dark:text-sky-300",
  "text-violet-600 dark:text-violet-300",
  "text-emerald-600 dark:text-emerald-300",
  "text-amber-700 dark:text-amber-300",
  "text-rose-600 dark:text-rose-300",
  "text-cyan-600 dark:text-cyan-300",
  "text-fuchsia-600 dark:text-fuchsia-300",
  "text-orange-600 dark:text-orange-300",
  "text-teal-600 dark:text-teal-300",
  "text-indigo-600 dark:text-indigo-300",
  "text-lime-700 dark:text-lime-300",
  "text-pink-600 dark:text-pink-300",
  "text-blue-600 dark:text-blue-300",
  "text-green-600 dark:text-green-300",
  "text-yellow-700 dark:text-yellow-300",
  "text-purple-600 dark:text-purple-300",
  "text-red-600 dark:text-red-300",
  "text-slate-600 dark:text-slate-300",
  "text-stone-600 dark:text-stone-300",
  "text-zinc-600 dark:text-zinc-300",
] as const

const DOT_PALETTE = [
  "bg-sky-500 dark:bg-sky-400",
  "bg-violet-500 dark:bg-violet-400",
  "bg-emerald-500 dark:bg-emerald-400",
  "bg-amber-500 dark:bg-amber-400",
  "bg-rose-500 dark:bg-rose-400",
  "bg-cyan-500 dark:bg-cyan-400",
  "bg-fuchsia-500 dark:bg-fuchsia-400",
  "bg-orange-500 dark:bg-orange-400",
  "bg-teal-500 dark:bg-teal-400",
  "bg-indigo-500 dark:bg-indigo-400",
  "bg-lime-500 dark:bg-lime-400",
  "bg-pink-500 dark:bg-pink-400",
  "bg-blue-500 dark:bg-blue-400",
  "bg-green-500 dark:bg-green-400",
  "bg-yellow-500 dark:bg-yellow-400",
  "bg-purple-500 dark:bg-purple-400",
  "bg-red-500 dark:bg-red-400",
  "bg-slate-500 dark:bg-slate-400",
  "bg-stone-500 dark:bg-stone-400",
  "bg-zinc-500 dark:bg-zinc-400",
] as const

export const EXCERPT_CHAPTER_COLOR_COUNT = PALETTE.length

export function excerptChapterKeywordTextClass(chapterIndex: number): string {
  return PALETTE[chapterIndex % EXCERPT_CHAPTER_COLOR_COUNT]!
}

export function excerptChapterDotClass(chapterIndex: number): string {
  return DOT_PALETTE[chapterIndex % EXCERPT_CHAPTER_COLOR_COUNT]!
}
