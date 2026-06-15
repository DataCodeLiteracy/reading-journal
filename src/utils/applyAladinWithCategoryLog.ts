import type { AladinBookMetadata } from "@/types/aladin"
import type { AladinCategoryApplySource } from "@/types/aladinCategoryApplyLog"
import type { BookCategoryTree } from "@/types/bookCategory"
import { postAladinCategoryApplyLog } from "@/services/aladinCategoryApplyLogService"
import {
  applyAladinBookMetadata,
  type AladinBookFormSetters,
} from "@/utils/applyAladinBookMetadata"
import { diagnoseAladinCategoryApply } from "@/utils/diagnoseAladinCategoryApply"
import { enrichAladinBookMetadata } from "@/utils/enrichAladinBookMetadata"

/** 알라딘 메타 반영 + (로그인 시) 분류 진단 로그 저장 */
export function applyAladinWithCategoryLog(params: {
  metadata: AladinBookMetadata
  categoryTree: BookCategoryTree | undefined
  source: AladinCategoryApplySource
  bookTitle: string
  userId: string | undefined
  setters: AladinBookFormSetters
}): AladinBookMetadata {
  const enriched = enrichAladinBookMetadata(
    params.metadata,
    params.categoryTree,
  )
  applyAladinBookMetadata(enriched, params.setters)

  if (params.userId) {
    const diagnosis = diagnoseAladinCategoryApply({
      rawMetadata: params.metadata,
      enrichedMetadata: enriched,
      tree: params.categoryTree,
      source: params.source,
      bookTitle: params.bookTitle,
      userId: params.userId,
    })
    const { userId: _uid, createdAt: _at, ...logEntry } = diagnosis
    void postAladinCategoryApplyLog(logEntry)
  }

  return enriched
}
