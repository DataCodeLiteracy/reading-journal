"use client"

import { useQuery } from "@tanstack/react-query"
import { BookCategoryService } from "@/services/bookCategoryService"
import { queryKeys } from "@/lib/queryKeys"

export function useBookCategories() {
  return useQuery({
    queryKey: queryKeys.bookCategories.tree(),
    queryFn: () => BookCategoryService.getCategoryTree(),
    staleTime: 5 * 60 * 1000,
  })
}
