import { buildKdcClassification } from "@/lib/kdcClassification"
import type { BookLookupMetadata } from "@/types/bookLookup"

/** NLK·병합 결과의 KDC 코드·주제를 폼/저장용으로 정규화 */
export function normalizeBookLookupKdc(
  metadata: BookLookupMetadata,
): BookLookupMetadata {
  const rebuilt = buildKdcClassification({
    majorCode: metadata.kdcMajorCode,
    majorLabel: metadata.kdcMajorLabel,
    kdcDetail: metadata.kdcDetailCode,
  })

  const subjects = metadata.subjects?.filter(
    (s) => s.trim().length >= 2 && !/^\d{1,3}(\.\d+)?$/.test(s.trim()),
  )

  return {
    ...metadata,
    ...rebuilt,
    kdcMajorCode: rebuilt.kdcMajorCode ?? metadata.kdcMajorCode,
    kdcMajorLabel: rebuilt.kdcMajorLabel ?? metadata.kdcMajorLabel,
    kdcMiddleCode: rebuilt.kdcMiddleCode ?? metadata.kdcMiddleCode,
    kdcMiddleLabel: rebuilt.kdcMiddleLabel ?? metadata.kdcMiddleLabel,
    kdcDetailCode: rebuilt.kdcDetailCode ?? metadata.kdcDetailCode,
    subjects: subjects?.length ? subjects : undefined,
  }
}
