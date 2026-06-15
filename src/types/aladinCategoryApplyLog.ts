import type { AladinCategoryInfo } from "@/types/aladin"

export type AladinCategoryApplySource = "add-book-modal" | "edit-book-modal"

export type AladinCategoryDiagnosisSeverity = "ok" | "warning" | "error"

export type AladinCategoryDiagnosisIssue =
  | "no_aladin_categories"
  | "mapping_failed"
  | "depth2_without_depth1"
  | "depth1_without_depth2"
  | "tree_not_loaded"
  | "depth1_not_in_tree"
  | "depth1_inactive"
  | "depth2_not_in_tree"
  | "depth2_inactive"
  | "depth2_parent_mismatch"
  | "client_remap_changed_ids"

export type AladinCategoryApplyLogEntry = {
  userId: string
  source: AladinCategoryApplySource
  bookTitle: string
  isbn13?: string
  severity: AladinCategoryDiagnosisSeverity
  issues: AladinCategoryDiagnosisIssue[]
  messages: string[]
  rawCategoryDepth1Id?: string
  rawCategoryDepth1Label?: string
  rawCategoryDepth2Id?: string
  rawCategoryDepth2Label?: string
  enrichedCategoryDepth1Id?: string
  enrichedCategoryDepth1Label?: string
  enrichedCategoryDepth2Id?: string
  enrichedCategoryDepth2Label?: string
  aladinCategoryInfos?: AladinCategoryInfo[]
  treeLoaded: boolean
  treeDepth1Count?: number
  treeDepth2Count?: number
  depth1InTree?: boolean
  depth1Active?: boolean
  depth2InTree?: boolean
  depth2Active?: boolean
  depth2ParentMatches?: boolean
  createdAt?: string
}
