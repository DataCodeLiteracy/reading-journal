"use client"

import { useState, useEffect, useMemo } from "react"
import type { DocumentData, QueryDocumentSnapshot } from "firebase/firestore"
import { useQuery } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { PenSquare, Search, Filter, X, Globe, User, ArrowLeft } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { RecordService, RecordContent } from "@/services/recordService"
import {
  RECORD_PAGE_SIZE,
  countQuoteRecordsPage,
  fetchQuoteRecordsPage,
} from "@/services/recordPaginatedService"
import { Book } from "@/types/book"
import RecordContentCard from "@/components/RecordContentCard"
import RecordListLoading from "@/components/RecordListLoading"
import Pagination from "@/components/Pagination"
import Select, { type SelectOption } from "@/components/Select"
import { queryKeys } from "@/lib/queryKeys"

export default function QuotesPage() {
  const router = useRouter()
  const { isLoggedIn, loading, userUid } = useAuth()
  // 필터 및 검색 상태
  const [selectedBookId, setSelectedBookId] = useState<string>("")
  const [searchQuery, setSearchQuery] = useState("")
  const [showOnlyMine, setShowOnlyMine] = useState(true) // 기본값: 내 데이터만 보기
  const [currentPage, setCurrentPage] = useState(1)

  useEffect(() => {
    if (!loading && !isLoggedIn) {
      router.push("/login")
    }
  }, [isLoggedIn, loading, router])

  const booksQuery = useQuery({
    queryKey: queryKeys.record.availableBooks(userUid!, showOnlyMine),
    queryFn: () => RecordService.getAvailableBooks(userUid!, showOnlyMine),
    enabled: Boolean(isLoggedIn && userUid),
    staleTime: 30_000,
  })

  const scopeKey = useMemo(
    () => [selectedBookId, searchQuery, String(showOnlyMine)].join("\u001f"),
    [selectedBookId, searchQuery, showOnlyMine],
  )

  useEffect(() => {
    setCurrentPage(1)
  }, [scopeKey])

  const countQuery = useQuery({
    queryKey: queryKeys.record.contentCount(userUid!, "quote", scopeKey),
    queryFn: () =>
      countQuoteRecordsPage({
        userUid: userUid!,
        showOnlyMine,
        bookId: selectedBookId || undefined,
        searchQuery,
      }),
    enabled: Boolean(isLoggedIn && userUid),
    staleTime: 15_000,
  })

  const totalPages = Math.max(
    1,
    Math.ceil((countQuery.data ?? 0) / RECORD_PAGE_SIZE),
  )

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [currentPage, totalPages])

  const recordsQuery = useQuery({
    queryKey: queryKeys.record.contentPage(
      userUid!,
      "quote",
      scopeKey,
      currentPage,
    ),
    queryFn: async () => {
      let cursor: QueryDocumentSnapshot<DocumentData> | null = null
      for (let p = 1; p < currentPage; p++) {
        const batch = await fetchQuoteRecordsPage({
          userUid: userUid!,
          showOnlyMine,
          bookId: selectedBookId || undefined,
          searchQuery,
          startAfterSnapshot: cursor,
        })
        if (batch.done || !batch.nextCursor) {
          return { records: [] as RecordContent[], done: true as const }
        }
        cursor = batch.nextCursor
      }
      return fetchQuoteRecordsPage({
        userUid: userUid!,
        showOnlyMine,
        bookId: selectedBookId || undefined,
        searchQuery,
        startAfterSnapshot: cursor,
      })
    },
    enabled: Boolean(isLoggedIn && userUid),
    staleTime: 15_000,
  })

  const availableBooks: Book[] = booksQuery.data ?? []
  const bookFilterOptions = useMemo((): SelectOption<string>[] => {
    const opts: SelectOption<string>[] = [{ value: "", label: "전체 책" }]
    for (const book of availableBooks) {
      opts.push({
        value: book.id,
        label: `${book.title}${book.author ? ` - ${book.author}` : ""}`,
      })
    }
    return opts
  }, [availableBooks])
  const records: RecordContent[] = recordsQuery.data?.records ?? []
  const isLoading = recordsQuery.isPending && !recordsQuery.data
  const error = recordsQuery.isError
    ? "구절 기록을 불러오는 중 오류가 발생했습니다."
    : null

  const handleBookFilterChange = (bookId: string) => {
    setSelectedBookId(bookId)
  }

  const handleSearchChange = (query: string) => {
    setSearchQuery(query)
  }

  const handleToggleShowOnlyMine = () => {
    setShowOnlyMine(!showOnlyMine)
  }

  if (loading) {
    return <RecordListLoading variant='auth' />
  }

  if (!isLoggedIn) {
    return null
  }

  return (
    <div className='min-h-screen bg-theme-gradient pb-20'>
      <div className='container mx-auto px-4 py-6'>
        {/* 뒤로가기 버튼 */}
        <div className='mb-4'>
          <button
            onClick={() => router.push("/record")}
            className='flex items-center gap-2 text-theme-secondary hover:text-theme-primary transition-colors'
          >
            <ArrowLeft className='h-5 w-5' />
            <span>기록으로 돌아가기</span>
          </button>
        </div>

        <header className='mb-6'>
          <h1 className='text-3xl font-bold text-theme-primary mb-2'>
            ✍️ 구절 기록
          </h1>
          <p className='text-theme-secondary text-sm'>
            인상 깊은 구절을 기록하고 다른 독서자들과 공유해보세요
          </p>
        </header>

        {/* 필터 및 검색 섹션 */}
        <div className='bg-theme-secondary rounded-lg p-4 mb-6 shadow-sm border-card'>
          <div className='space-y-4'>
            {/* 검색 */}
            <div>
              <label className='block text-sm font-medium text-theme-primary mb-2'>
                검색
              </label>
              <div className='relative'>
                <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400' />
                <input
                  type='text'
                  placeholder='구절 내용, 책 제목, 저자, 사용자 이름으로 검색...'
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className='w-full pl-10 pr-10 py-2 border border-theme-tertiary rounded-lg bg-theme-primary text-theme-primary placeholder:text-theme-tertiary focus:outline-none focus:ring-2 focus:ring-accent-theme'
                />
                {searchQuery && (
                  <button
                    onClick={() => handleSearchChange("")}
                    className='absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 hover:text-gray-600 transition-colors'
                  >
                    <X className='h-4 w-4' />
                  </button>
                )}
              </div>
            </div>

            {/* 책 필터 */}
            <div>
              <label className='block text-sm font-medium text-theme-primary mb-2'>
                책 선택
              </label>
              <div className='relative'>
                <Filter className='pointer-events-none absolute left-3 top-1/2 z-[1] h-4 w-4 -translate-y-1/2 transform text-gray-400' />
                <Select
                  value={selectedBookId}
                  onChange={handleBookFilterChange}
                  options={bookFilterOptions}
                  variant='toolbar'
                  triggerClassName='pl-10'
                  aria-label='책 선택'
                />
              </div>
            </div>

            {/* 내 데이터만 보기 토글 */}
            <div className='flex items-center justify-between'>
              <label className='flex items-center gap-2 cursor-pointer'>
                <input
                  type='checkbox'
                  checked={showOnlyMine}
                  onChange={handleToggleShowOnlyMine}
                  className='w-4 h-4 text-accent-theme bg-gray-100 border-gray-300 rounded focus:ring-accent-theme'
                />
                <span className='text-sm text-theme-primary'>
                  내 기록만 보기
                </span>
              </label>
              <div className='flex items-center gap-2 text-xs text-theme-secondary'>
                {showOnlyMine ? (
                  <>
                    <User className='h-4 w-4' />
                    <span>내 기록</span>
                  </>
                ) : (
                  <>
                    <Globe className='h-4 w-4' />
                    <span>전체 기록</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 에러 메시지 */}
        {error && (
          <div className='mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg'>
            <p className='text-red-700 dark:text-red-400 text-sm'>{error}</p>
          </div>
        )}

        {/* 기록 목록 */}
        {isLoading ? (
          <RecordListLoading variant='quotes' />
        ) : records.length === 0 ? (
          <div className='text-center py-12'>
            <PenSquare className='h-12 w-12 text-gray-400 mx-auto mb-4' />
            <h3 className='text-lg font-medium text-theme-primary mb-2'>
              구절 기록이 없습니다
            </h3>
            <p className='text-theme-secondary'>
              {showOnlyMine
                ? "아직 작성한 구절 기록이 없습니다."
                : "공개된 구절 기록이 없습니다."}
            </p>
          </div>
        ) : (
          <>
            <div className='mb-4 flex items-center justify-between'>
              <p className='text-sm text-theme-secondary'>
                총 {countQuery.data ?? 0}건 · 이 페이지 {records.length}건
              </p>
            </div>
            <div className='space-y-4 mb-6'>
              {records.map((record) => (
                <RecordContentCard key={`${record.contentType}-${record.id}`} content={record} />
              ))}
            </div>

            {(countQuery.data ?? 0) > 0 && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                totalItems={countQuery.data ?? 0}
                itemsPerPage={RECORD_PAGE_SIZE}
              />
            )}
          </>
        )}
      </div>
    </div>
  )
}

