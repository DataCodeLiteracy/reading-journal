import { mapAladinCategoryInfos } from "@/lib/aladinCategoryMapping"
import type { AladinBookMetadata } from "@/types/aladin"
import type { BookCategoryTree } from "@/types/bookCategory"
import { BookCategoryService } from "@/services/bookCategoryService"

/** 알라딘 응답 + 앱 분야 트리(Firestore)로 대·중분류 id를 채웁니다. */
export function enrichAladinBookMetadata(
  metadata: AladinBookMetadata,
  tree: BookCategoryTree | undefined,
): AladinBookMetadata {
  if (!tree?.depth1.length) return metadata

  const infos = metadata.aladinCategoryInfos
  if (infos?.length) {
    const mapped = mapAladinCategoryInfos(infos, tree)
    if (mapped) {
      return { ...metadata, ...mapped }
    }
  }

  const d2Id = metadata.categoryDepth2Id?.trim() ?? ""
  const d1Id = metadata.categoryDepth1Id?.trim() ?? ""
  if (d2Id && !d1Id) {
    const d2 = BookCategoryService.findDepth2(tree, d2Id)
    const d1 = d2 ? BookCategoryService.findDepth1(tree, d2.parentId) : undefined
    if (d2 && d1) {
      return {
        ...metadata,
        categoryDepth1Id: d1.id,
        categoryDepth1Label: d1.label,
        categoryDepth2Id: d2.id,
        categoryDepth2Label: d2.label,
      }
    }
  }

  return metadata
}
