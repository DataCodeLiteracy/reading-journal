import { mapAladinCategoryInfos } from "@/lib/aladinCategoryMapping"
import type { AladinBookMetadata } from "@/types/aladin"
import type { BookCategoryTree } from "@/types/bookCategory"

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

  return metadata
}
