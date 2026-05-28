import { readdir, readFile } from "fs/promises"
import path from "path"
import type { BookCategoryDepth1, BookCategoryDepth2 } from "@/types/bookCategory"

/** `public/분야/` 아래 JSON 시드 파일 */
export const BOOK_CATEGORY_PUBLIC_DIR = "분야"

export type BookCategorySeedPayload = {
  version?: number
  description?: string
  depth1: Omit<BookCategoryDepth1, "created_at" | "updated_at">[]
  depth2: Omit<BookCategoryDepth2, "created_at" | "updated_at">[]
}

function publicSeedDir(): string {
  return path.join(process.cwd(), "public", BOOK_CATEGORY_PUBLIC_DIR)
}

function assertSafeJsonFileName(fileName: string): string {
  const base = path.basename(fileName.trim())
  if (!base || !base.endsWith(".json") || base.includes("..")) {
    throw new Error("유효한 .json 파일명이 필요합니다.")
  }
  return base
}

function pickCategoryArrays(o: Record<string, unknown>): {
  depth1Raw: unknown[]
  depth2Raw: unknown[]
} {
  const depth1Raw = o.대분류 ?? o.depth1
  const depth2Raw = o.중분류 ?? o.depth2
  if (!Array.isArray(depth1Raw) || !Array.isArray(depth2Raw)) {
    throw new Error(
      "대분류·중분류(또는 depth1·depth2) 배열이 필요합니다."
    )
  }
  return { depth1Raw, depth2Raw }
}

export function parseBookCategorySeedJson(raw: unknown): BookCategorySeedPayload {
  if (!raw || typeof raw !== "object") {
    throw new Error("JSON 루트는 객체여야 합니다.")
  }
  const o = raw as Record<string, unknown>
  const { depth1Raw, depth2Raw } = pickCategoryArrays(o)

  const depth1 = depth1Raw.map((item, i) => {
    if (!item || typeof item !== "object") {
      throw new Error(`대분류[${i}] 형식이 잘못되었습니다.`)
    }
    const d = item as Record<string, unknown>
    const id = String(d.id ?? "").trim()
    const label = String(d.label ?? "").trim()
    if (!id || !label) {
      throw new Error(`대분류[${i}]에 id, label이 필요합니다.`)
    }
    return {
      id,
      label,
      order: typeof d.order === "number" ? d.order : i,
      isActive: d.isActive !== false,
    }
  })

  const depth1Ids = new Set(depth1.map((d) => d.id))
  const depth1IdList = depth1.map((d) => d.id)
  if (depth1IdList.length !== depth1Ids.size) {
    throw new Error("대분류 id가 서로 중복됩니다.")
  }

  const depth2Ids = new Set<string>()
  const depth2 = depth2Raw.map((item, i) => {
    if (!item || typeof item !== "object") {
      throw new Error(`중분류[${i}] 형식이 잘못되었습니다.`)
    }
    const d = item as Record<string, unknown>
    const id = String(d.id ?? "").trim()
    const parentId = String(d.parentId ?? "").trim()
    const label = String(d.label ?? "").trim()
    if (!id || !parentId || !label) {
      throw new Error(`중분류[${i}]에 id, parentId, label이 필요합니다.`)
    }
    if (!depth1Ids.has(parentId)) {
      throw new Error(
        `중분류[${i}]의 parentId «${parentId}»가 대분류에 없습니다.`
      )
    }
    if (depth2Ids.has(id)) {
      throw new Error(
        `중분류 id «${id}»가 중복됩니다. id는 전역에서 유일해야 합니다(예: {대분류CID}_{중분류CID}).`
      )
    }
    depth2Ids.add(id)

    const aladinCid =
      d.aladinCid != null ? String(d.aladinCid).trim() : undefined

    return {
      id,
      parentId,
      label,
      order: typeof d.order === "number" ? d.order : i,
      isActive: d.isActive !== false,
      ...(aladinCid ? { aladinCid } : {}),
      ...(d.isOther === true ? { isOther: true } : {}),
    }
  })

  return {
    version: typeof o.version === "number" ? o.version : undefined,
    description:
      typeof o.description === "string" ? o.description : undefined,
    depth1,
    depth2,
  }
}

export async function listBookCategorySeedFiles(): Promise<string[]> {
  try {
    const dir = publicSeedDir()
    const names = await readdir(dir)
    return names.filter((n) => n.endsWith(".json")).sort()
  } catch {
    return []
  }
}

export async function loadBookCategorySeedFromPublic(
  fileName = "default.json"
): Promise<BookCategorySeedPayload> {
  const safe = assertSafeJsonFileName(fileName)
  const filePath = path.join(publicSeedDir(), safe)
  const text = await readFile(filePath, "utf-8")
  return parseBookCategorySeedJson(JSON.parse(text))
}
