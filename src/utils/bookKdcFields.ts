import type { BookKdcClassification } from "@/types/bookClassification"

export function formatKdcCategoryDisplay(book: BookKdcClassification): string | undefined {
  const major = book.kdcMajorLabel?.trim()
  const middle = book.kdcMiddleLabel?.trim()
  if (major && middle) return `${major} / ${middle}`
  return major || middle || undefined
}

export function buildBookKdcFields(
  classification: BookKdcClassification & { subjects?: string[] },
): Pick<
  BookKdcClassification,
  | "kdcMajorCode"
  | "kdcMajorLabel"
  | "kdcMiddleCode"
  | "kdcMiddleLabel"
  | "kdcDetailCode"
> & { subjects?: string[] } {
  const majorCode = classification.kdcMajorCode?.trim()
  const majorLabel = classification.kdcMajorLabel?.trim()
  const middleCode = classification.kdcMiddleCode?.trim()
  const middleLabel = classification.kdcMiddleLabel?.trim()
  const detailCode = classification.kdcDetailCode?.trim()
  const subjects = classification.subjects?.map((s) => s.trim()).filter(Boolean)

  if (
    !majorCode &&
    !majorLabel &&
    !middleCode &&
    !middleLabel &&
    !detailCode &&
    !subjects?.length
  ) {
    return {}
  }

  return {
    ...(majorCode ? { kdcMajorCode: majorCode } : {}),
    ...(majorLabel ? { kdcMajorLabel: majorLabel } : {}),
    ...(middleCode ? { kdcMiddleCode: middleCode } : {}),
    ...(middleLabel ? { kdcMiddleLabel: middleLabel } : {}),
    ...(detailCode ? { kdcDetailCode: detailCode } : {}),
    ...(subjects?.length ? { subjects } : {}),
  }
}

/** 저장 시 KDC·주제 필드를 명시적으로 반영 (비우면 undefined) */
export function buildBookKdcFieldsForSave(
  classification: BookKdcClassification & { subjects?: string[] },
): Pick<
  BookKdcClassification,
  | "kdcMajorCode"
  | "kdcMajorLabel"
  | "kdcMiddleCode"
  | "kdcMiddleLabel"
  | "kdcDetailCode"
> & { subjects?: string[] } {
  const majorCode = classification.kdcMajorCode?.trim()
  const majorLabel = classification.kdcMajorLabel?.trim()
  const middleCode = classification.kdcMiddleCode?.trim()
  const middleLabel = classification.kdcMiddleLabel?.trim()
  const detailCode = classification.kdcDetailCode?.trim()
  const subjects = classification.subjects?.map((s) => s.trim()).filter(Boolean)

  return {
    kdcMajorCode: majorCode || undefined,
    kdcMajorLabel: majorLabel || undefined,
    kdcMiddleCode: middleCode || undefined,
    kdcMiddleLabel: middleLabel || undefined,
    kdcDetailCode: detailCode || undefined,
    subjects: subjects?.length ? subjects : undefined,
  }
}

/** 알라딘 시대 대·중분류 필드 제거용 */
export function clearLegacyBookCategoryFields(): {
  categoryDepth1Id: undefined
  categoryDepth1Label: undefined
  categoryDepth2Id: undefined
  categoryDepth2Label: undefined
} {
  return {
    categoryDepth1Id: undefined,
    categoryDepth1Label: undefined,
    categoryDepth2Id: undefined,
    categoryDepth2Label: undefined,
  }
}
