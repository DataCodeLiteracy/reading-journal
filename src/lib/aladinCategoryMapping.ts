import type { AladinCategoryInfo } from "@/types/aladin"
import type { BookCategoryDepth2, BookCategoryTree } from "@/types/bookCategory"

export type { AladinCategoryInfo }

export type MappedBookCategory = {
  categoryDepth1Id: string
  categoryDepth1Label: string
  categoryDepth2Id: string
  categoryDepth2Label: string
}

export function extractAladinCategoryInfos(
  categoryIdListRaw: unknown,
): AladinCategoryInfo[] {
  return normalizeCategoryInfos(categoryIdListRaw)
}

export function extractCategoryIdListFromItem(
  item: Record<string, unknown>,
): unknown {
  const sub = item.subInfo
  const subObj =
    sub && typeof sub === "object" ? (sub as Record<string, unknown>) : null
  return (
    item.categoryIdList ??
    subObj?.categoryIdList ??
    item.CategoryIdList ??
    null
  )
}

function normalizeCategoryInfos(raw: unknown): AladinCategoryInfo[] {
  if (!raw) return []
  if (Array.isArray(raw)) {
    return raw
      .map((item) => parseCategoryInfoItem(item))
      .filter((x): x is AladinCategoryInfo => x !== null)
  }
  if (typeof raw === "object") {
    const list = (raw as { categoryInfo?: unknown }).categoryInfo
    if (!list) return []
    const arr = Array.isArray(list) ? list : [list]
    return arr
      .map((item) => parseCategoryInfoItem(item))
      .filter((x): x is AladinCategoryInfo => x !== null)
  }
  return []
}

function parseCategoryInfoItem(item: unknown): AladinCategoryInfo | null {
  if (!item || typeof item !== "object") return null
  const o = item as Record<string, unknown>
  const categoryId = String(o.categoryId ?? o["categoryId"] ?? "").trim()
  const categoryName = String(
    o.categoryName ?? o["categoryName"] ?? "",
  ).trim()
  if (!categoryId) return null
  return { categoryId, categoryName }
}

function findDepth2ByAladinCid(
  tree: BookCategoryTree,
  cid: string,
): BookCategoryDepth2 | undefined {
  const byCid = tree.depth2.find((d) => d.aladinCid === cid)
  if (byCid) return byCid
  return tree.depth2.find(
    (d) => d.id === cid || d.id.endsWith(`_${cid}`),
  )
}

/** 알라딘 categoryIdList → 서재 대·중분류 id (Firestore/UI 트리 기준) */
export function mapAladinCategoryIdList(
  categoryIdListRaw: unknown,
  tree: BookCategoryTree,
): MappedBookCategory | null {
  const infos = normalizeCategoryInfos(categoryIdListRaw)
  return mapAladinCategoryInfos(infos, tree)
}

export function mapAladinCategoryInfos(
  infos: AladinCategoryInfo[],
  tree: BookCategoryTree,
): MappedBookCategory | null {
  if (infos.length === 0) return null

  const depth1ById = new Map(tree.depth1.map((d) => [d.id, d]))

  for (let i = infos.length - 1; i >= 0; i--) {
    const cid = infos[i].categoryId
    const d2 = findDepth2ByAladinCid(tree, cid)
    if (d2) {
      const d1 = depth1ById.get(d2.parentId)
      if (d1) {
        return {
          categoryDepth1Id: d1.id,
          categoryDepth1Label: d1.label,
          categoryDepth2Id: d2.id,
          categoryDepth2Label: d2.label,
        }
      }
    }
  }

  for (let i = infos.length - 1; i >= 0; i--) {
    const cid = infos[i].categoryId
    const d1 = depth1ById.get(cid)
    if (d1) {
      const other =
        tree.depth2.find((d) => d.parentId === d1.id && d.isOther) ??
        tree.depth2.find((d) => d.parentId === d1.id)
      if (other) {
        return {
          categoryDepth1Id: d1.id,
          categoryDepth1Label: d1.label,
          categoryDepth2Id: other.id,
          categoryDepth2Label: other.label,
        }
      }
    }
  }

  return null
}
