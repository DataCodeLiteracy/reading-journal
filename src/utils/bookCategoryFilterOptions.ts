import type { SelectOption } from "@/components/Select"
import type { BookCategoryTree } from "@/types/bookCategory"
import { BookCategoryService } from "@/services/bookCategoryService"

/** 서재·탐색 분야 필터용 옵션 (대분류 > 중분류) */
export function buildCategoryFilterOptions(
  tree: BookCategoryTree | undefined
): SelectOption<string>[] {
  const opts: SelectOption<string>[] = [{ value: "", label: "전체" }]

  if (!tree) return opts
  for (const d1 of BookCategoryService.getActiveDepth1(tree)) {
    for (const d2 of BookCategoryService.getActiveDepth2ForParent(tree, d1.id)) {
      opts.push({
        value: d2.id,
        label: `${d1.label} > ${d2.label}`,
      })
    }
  }

  return opts
}
