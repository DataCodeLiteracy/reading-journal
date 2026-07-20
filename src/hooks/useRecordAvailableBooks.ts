"use client"

import { useQuery } from "@tanstack/react-query"
import { queryKeys } from "@/lib/queryKeys"
import { BookService } from "@/services/bookService"
import { RecordService } from "@/services/recordService"
import type { Book } from "@/types/book"

/** 기록 필터용 책 목록 — 내 것만이면 userBooks 캐시를 재사용합니다. */
export function useRecordAvailableBooks(
  userUid: string | null | undefined,
  showOnlyMine: boolean,
  enabled: boolean,
) {
  const mineQuery = useQuery({
    queryKey: queryKeys.user.books(userUid),
    queryFn: () => BookService.getUserBooks(userUid!),
    enabled: enabled && Boolean(userUid) && showOnlyMine,
    staleTime: 30_000,
  })

  const publicQuery = useQuery({
    queryKey: queryKeys.record.availableBooks(userUid ?? "", false),
    queryFn: () => RecordService.getAvailableBooks(userUid!, false),
    enabled: enabled && Boolean(userUid) && !showOnlyMine,
    staleTime: 30_000,
  })

  const data: Book[] = showOnlyMine
    ? (mineQuery.data ?? [])
    : (publicQuery.data ?? [])

  return {
    data,
    isPending: showOnlyMine ? mineQuery.isPending : publicQuery.isPending,
    isFetching: showOnlyMine ? mineQuery.isFetching : publicQuery.isFetching,
    isFetched: showOnlyMine ? mineQuery.isFetched : publicQuery.isFetched,
    isError: showOnlyMine ? mineQuery.isError : publicQuery.isError,
  }
}
