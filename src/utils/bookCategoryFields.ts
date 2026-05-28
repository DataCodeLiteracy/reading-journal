import type { Book } from "@/types/book"
import type { BookCategoryDepth1, BookCategoryDepth2 } from "@/types/bookCategory"

export function formatBookCategoryDisplay(
  book: Pick<Book, "categoryDepth1Label" | "categoryDepth2Label">
): string {
  if (book.categoryDepth1Label && book.categoryDepth2Label) {
    return `${book.categoryDepth1Label} > ${book.categoryDepth2Label}`
  }
  return ""
}

export function buildBookCategoryFields(
  depth1: BookCategoryDepth1 | null | undefined,
  depth2: BookCategoryDepth2 | null | undefined
): Pick<
  Book,
  | "categoryDepth1Id"
  | "categoryDepth1Label"
  | "categoryDepth2Id"
  | "categoryDepth2Label"
> {
  if (!depth1 || !depth2) {
    return {
      categoryDepth1Id: undefined,
      categoryDepth1Label: undefined,
      categoryDepth2Id: undefined,
      categoryDepth2Label: undefined,
    }
  }
  return {
    categoryDepth1Id: depth1.id,
    categoryDepth1Label: depth1.label,
    categoryDepth2Id: depth2.id,
    categoryDepth2Label: depth2.label,
  }
}
