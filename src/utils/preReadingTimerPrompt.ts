import { getKoreaDate } from "@/utils/timeUtils"

const PREFIX = "readingJournal.preReadTimerDismiss_"

export function preReadTimerDismissStorageKey(bookId: string, dateKst: string) {
  return `${PREFIX}${bookId}_${dateKst}`
}

export function isPreReadTimerPromptDismissedToday(bookId: string): boolean {
  if (typeof window === "undefined") return false
  try {
    const key = preReadTimerDismissStorageKey(bookId, getKoreaDate(new Date()))
    return window.localStorage.getItem(key) === "1"
  } catch {
    return false
  }
}

export function setPreReadTimerPromptDismissedToday(bookId: string): void {
  if (typeof window === "undefined") return
  try {
    const key = preReadTimerDismissStorageKey(bookId, getKoreaDate(new Date()))
    window.localStorage.setItem(key, "1")
  } catch {
    /* ignore */
  }
}

export function clearPreReadTimerPromptDismissedToday(bookId: string): void {
  if (typeof window === "undefined") return
  try {
    const key = preReadTimerDismissStorageKey(bookId, getKoreaDate(new Date()))
    window.localStorage.removeItem(key)
  } catch {
    /* ignore */
  }
}
