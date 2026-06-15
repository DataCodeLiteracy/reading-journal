import type { AladinBookMetadata } from "@/types/aladin"
import type {
  AladinCategoryApplyLogEntry,
  AladinCategoryDiagnosisIssue,
  AladinCategoryDiagnosisSeverity,
} from "@/types/aladinCategoryApplyLog"
import type { BookCategoryTree } from "@/types/bookCategory"
import { BookCategoryService } from "@/services/bookCategoryService"

const ISSUE_MESSAGES: Record<AladinCategoryDiagnosisIssue, string> = {
  no_aladin_categories: "알라딘 categoryIdList가 없거나 매핑 결과가 비었습니다.",
  mapping_failed: "알라딘 분류 CID를 앱 분야 트리에 매핑하지 못했습니다.",
  depth2_without_depth1: "중분류 ID만 있고 대분류 ID가 없습니다.",
  depth1_without_depth2: "대분류 ID만 있고 중분류 ID가 없습니다.",
  tree_not_loaded: "Firestore 분야 트리가 아직 로드되지 않았습니다.",
  depth1_not_in_tree: "대분류 ID가 Firestore 트리에 없습니다.",
  depth1_inactive: "대분류가 Firestore에서 비활성(isActive: false)입니다.",
  depth2_not_in_tree: "중분류 ID가 Firestore 트리에 없습니다.",
  depth2_inactive: "중분류가 Firestore에서 비활성(isActive: false)입니다.",
  depth2_parent_mismatch: "중분류의 parentId와 대분류 ID가 일치하지 않습니다.",
  client_remap_changed_ids:
    "클라이언트 재매핑(enrich)이 서버 매핑 ID와 달라졌습니다.",
}

function severityFromIssues(
  issues: AladinCategoryDiagnosisIssue[],
): AladinCategoryDiagnosisSeverity {
  if (issues.length === 0) return "ok"
  const errors: AladinCategoryDiagnosisIssue[] = [
    "mapping_failed",
    "depth2_without_depth1",
    "depth1_not_in_tree",
    "depth2_not_in_tree",
    "depth2_parent_mismatch",
    "tree_not_loaded",
  ]
  if (issues.some((i) => errors.includes(i))) return "error"
  return "warning"
}

export function diagnoseAladinCategoryApply(params: {
  rawMetadata: AladinBookMetadata
  enrichedMetadata: AladinBookMetadata
  tree: BookCategoryTree | undefined
  source: AladinCategoryApplyLogEntry["source"]
  bookTitle: string
  userId: string
}): AladinCategoryApplyLogEntry {
  const { rawMetadata, enrichedMetadata, tree, source, bookTitle, userId } =
    params
  const issues: AladinCategoryDiagnosisIssue[] = []

  const infos = rawMetadata.aladinCategoryInfos ?? []
  const rawD1 = rawMetadata.categoryDepth1Id?.trim() ?? ""
  const rawD2 = rawMetadata.categoryDepth2Id?.trim() ?? ""
  const enrichedD1 = enrichedMetadata.categoryDepth1Id?.trim() ?? ""
  const enrichedD2 = enrichedMetadata.categoryDepth2Id?.trim() ?? ""

  if (!infos.length && !rawD1 && !rawD2) {
    issues.push("no_aladin_categories")
  }

  if (infos.length && !enrichedD1 && !enrichedD2) {
    issues.push("mapping_failed")
  }

  if (enrichedD2 && !enrichedD1) {
    issues.push("depth2_without_depth1")
  }
  if (enrichedD1 && !enrichedD2) {
    issues.push("depth1_without_depth2")
  }

  if (
    rawD1 &&
    enrichedD1 &&
    rawD2 &&
    enrichedD2 &&
    (rawD1 !== enrichedD1 || rawD2 !== enrichedD2)
  ) {
    issues.push("client_remap_changed_ids")
  }

  const treeLoaded = Boolean(tree?.depth1.length)
  if (!treeLoaded && (enrichedD1 || enrichedD2 || infos.length)) {
    issues.push("tree_not_loaded")
  }

  let depth1InTree: boolean | undefined
  let depth1Active: boolean | undefined
  let depth2InTree: boolean | undefined
  let depth2Active: boolean | undefined
  let depth2ParentMatches: boolean | undefined

  if (tree && enrichedD1) {
    const d1 = BookCategoryService.findDepth1(tree, enrichedD1)
    depth1InTree = Boolean(d1)
    depth1Active = d1?.isActive !== false
    if (!d1) issues.push("depth1_not_in_tree")
    else if (d1.isActive === false) issues.push("depth1_inactive")
  }

  if (tree && enrichedD2) {
    const d2 = BookCategoryService.findDepth2(tree, enrichedD2)
    depth2InTree = Boolean(d2)
    depth2Active = d2?.isActive !== false
    if (!d2) issues.push("depth2_not_in_tree")
    else if (d2.isActive === false) issues.push("depth2_inactive")

    if (d2 && enrichedD1 && d2.parentId !== enrichedD1) {
      depth2ParentMatches = false
      issues.push("depth2_parent_mismatch")
    } else if (d2 && enrichedD1) {
      depth2ParentMatches = true
    }
  }

  const uniqueIssues = [...new Set(issues)]
  const severity = severityFromIssues(uniqueIssues)
  const messages = uniqueIssues.map((i) => ISSUE_MESSAGES[i])

  return {
    userId,
    source,
    bookTitle: bookTitle.trim() || enrichedMetadata.title.trim() || "(제목 없음)",
    isbn13: enrichedMetadata.isbn13 ?? rawMetadata.isbn13,
    severity,
    issues: uniqueIssues,
    messages,
    rawCategoryDepth1Id: rawD1 || undefined,
    rawCategoryDepth1Label: rawMetadata.categoryDepth1Label,
    rawCategoryDepth2Id: rawD2 || undefined,
    rawCategoryDepth2Label: rawMetadata.categoryDepth2Label,
    enrichedCategoryDepth1Id: enrichedD1 || undefined,
    enrichedCategoryDepth1Label: enrichedMetadata.categoryDepth1Label,
    enrichedCategoryDepth2Id: enrichedD2 || undefined,
    enrichedCategoryDepth2Label: enrichedMetadata.categoryDepth2Label,
    aladinCategoryInfos: infos.length ? infos : undefined,
    treeLoaded,
    treeDepth1Count: tree?.depth1.length,
    treeDepth2Count: tree?.depth2.length,
    depth1InTree,
    depth1Active,
    depth2InTree,
    depth2Active,
    depth2ParentMatches,
  }
}
