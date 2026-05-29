import { readFile } from "fs/promises"
import path from "path"
import {
  parseBookCategorySeedJson,
  type BookCategorySeedPayload,
} from "@/lib/bookCategorySeedFile"
import type { BookCategoryTree } from "@/types/bookCategory"

async function readSeedJson(): Promise<BookCategorySeedPayload> {
  const candidates = [
    path.join(process.cwd(), "public", "category", "default.json"),
    path.join(process.cwd(), "public", "분야", "default.json"),
  ]
  for (const filePath of candidates) {
    try {
      const raw = JSON.parse(await readFile(filePath, "utf-8")) as unknown
      return parseBookCategorySeedJson(raw)
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e
    }
  }
  throw new Error("분야 시드 JSON을 찾을 수 없습니다.")
}

let cachedTree: BookCategoryTree | null = null

export async function loadBookCategoryTreeServer(): Promise<BookCategoryTree> {
  if (cachedTree) return cachedTree
  const seed = await readSeedJson()
  cachedTree = { depth1: seed.depth1, depth2: seed.depth2 }
  return cachedTree
}
