import { ApiClient } from "@/lib/apiClient"
import type {
  BookCategoryDepth1,
  BookCategoryDepth2,
  BookCategoryTree,
} from "@/types/bookCategory"

const DEPTH1_COLLECTION = "bookCategoryDepth1"
const DEPTH2_COLLECTION = "bookCategoryDepth2"

export class BookCategoryService {
  static async getCategoryTree(): Promise<BookCategoryTree> {
    const [depth1, depth2] = await Promise.all([
      ApiClient.queryDocuments<BookCategoryDepth1>(DEPTH1_COLLECTION, []),
      ApiClient.queryDocuments<BookCategoryDepth2>(DEPTH2_COLLECTION, []),
    ])

    const sortByOrder = <T extends { order: number }>(a: T, b: T) =>
      a.order - b.order || 0

    return {
      depth1: [...depth1].sort(sortByOrder),
      depth2: [...depth2].sort(sortByOrder),
    }
  }

  static getActiveDepth1(tree: BookCategoryTree): BookCategoryDepth1[] {
    return tree.depth1.filter((d) => d.isActive !== false)
  }

  static getActiveDepth2ForParent(
    tree: BookCategoryTree,
    parentId: string
  ): BookCategoryDepth2[] {
    return tree.depth2.filter(
      (d) => d.parentId === parentId && d.isActive !== false
    )
  }

  static findDepth1(
    tree: BookCategoryTree,
    id: string | undefined
  ): BookCategoryDepth1 | undefined {
    if (!id) return undefined
    return tree.depth1.find((d) => d.id === id)
  }

  static findDepth2(
    tree: BookCategoryTree,
    id: string | undefined
  ): BookCategoryDepth2 | undefined {
    if (!id) return undefined
    return tree.depth2.find((d) => d.id === id)
  }
}
