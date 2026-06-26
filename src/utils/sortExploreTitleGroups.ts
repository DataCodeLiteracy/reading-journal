import type { Book } from "@/types/book"
import type { ExploreTitleGroup } from "@/types/explore"

function latestCreatedMs(books: readonly Book[]): number {
  let max = 0
  for (const book of books) {
    const d = book.created_at
    if (!d) continue
    const ms = d instanceof Date ? d.getTime() : new Date(String(d)).getTime()
    if (!Number.isNaN(ms) && ms > max) max = ms
  }
  return max
}

function compareTitle(a: string, b: string): number {
  return a.localeCompare(b, "ko")
}

/** 탐색 페이지 — 판본 그룹 클라이언트 정렬 (Firestore fetch 후 묶음) */
export function sortExploreTitleGroups(
  groups: ExploreTitleGroup[],
  sortBy: string,
): ExploreTitleGroup[] {
  const out = [...groups]
  switch (sortBy) {
    case "title-desc":
      out.sort((a, b) => compareTitle(b.title, a.title))
      break
    case "title-asc":
      out.sort((a, b) => compareTitle(a.title, b.title))
      break
    case "rating-desc":
      out.sort(
        (a, b) =>
          b.avgRating - a.avgRating || compareTitle(a.title, b.title),
      )
      break
    case "author-asc":
      out.sort(
        (a, b) =>
          compareTitle(a.author, b.author) || compareTitle(a.title, b.title),
      )
      break
    case "users-desc":
      out.sort(
        (a, b) =>
          b.userCount - a.userCount || compareTitle(a.title, b.title),
      )
      break
    case "users-asc":
      out.sort(
        (a, b) =>
          a.userCount - b.userCount || compareTitle(a.title, b.title),
      )
      break
    case "recent-title":
    default:
      out.sort((a, b) => {
        const byRecent = latestCreatedMs(b.books) - latestCreatedMs(a.books)
        if (byRecent !== 0) return byRecent
        return compareTitle(a.title, b.title)
      })
      break
  }
  return out
}
