/** 회독 수(0–5, 5 이상은 5와 동일)에 따른 숫자 강조 색 */
export function rereadCountNumberClass(count: number): string {
  const n = Math.max(0, Math.min(5, Math.floor(Number(count) || 0)))
  switch (n) {
    case 0:
      return "text-theme-secondary"
    case 1:
      return "text-sky-600 dark:text-sky-400"
    case 2:
      return "text-teal-600 dark:text-teal-400"
    case 3:
      return "text-emerald-600 dark:text-emerald-400"
    case 4:
      return "text-amber-600 dark:text-amber-400"
    default:
      return "text-rose-600 dark:text-rose-400"
  }
}
