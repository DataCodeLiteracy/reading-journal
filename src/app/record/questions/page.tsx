"use client"

import { useState, useEffect, useMemo } from "react"
import type { DocumentData, QueryDocumentSnapshot } from "firebase/firestore"
import { useQuery } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { HelpCircle, Search, Filter, X, Globe, User, ArrowLeft } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { RecordService, RecordContent } from "@/services/recordService"
import {
  RECORD_PAGE_SIZE,
  countQuestionRecordsPage,
  fetchQuestionRecordsPage,
} from "@/services/recordPaginatedService"
import { Book } from "@/types/book"
import RecordContentCard from "@/components/RecordContentCard"
import RecordListLoading from "@/components/RecordListLoading"
import Pagination from "@/components/Pagination"
import { queryKeys } from "@/lib/queryKeys"

export default function QuestionsPage() {
  const router = useRouter()
  const { isLoggedIn, loading, userUid } = useAuth()
  const [selectedBookId, setSelectedBookId] = useState<string>("")
  const [searchQuery, setSearchQuery] = useState("")
  const [showOnlyMine, setShowOnlyMine] = useState(true)
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

  const myOwnedBookIds = useMemo(() => {
    if (!showOnlyMine || selectedBookId) return undefined
    return (booksQuery.data ?? []).map((b) => b.id).slice(0, 30)
  }, [showOnlyMine, selectedBookId, booksQuery.data])

  const mineBooksKey = useMemo(() => {
    if (!showOnlyMine || selectedBookId) return ""
    return (myOwnedBookIds ?? []).slice().sort().join(",")
  }, [showOnlyMine, selectedBookId, myOwnedBookIds])

  const scopeKey = useMemo(
    () =>
      [selectedBookId, searchQuery, String(showOnlyMine), mineBooksKey].join(
        "\u001f",
      ),
    [selectedBookId, searchQuery, showOnlyMine, mineBooksKey],
  )

  useEffect(() => {
    setCurrentPage(1)
  }, [scopeKey])

  const listReady =
    Boolean(isLoggedIn && userUid) &&
    (!showOnlyMine || Boolean(selectedBookId) || booksQuery.isFetched)

  const countQuery = useQuery({
    queryKey: queryKeys.record.contentCount(userUid!, "question", scopeKey),
    queryFn: () =>
      countQuestionRecordsPage({
        userUid: userUid!,
        showOnlyMine,
        bookId: selectedBookId || undefined,
        myOwnedBookIds,
        searchQuery,
      }),
    enabled: listReady,
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
      "question",
      scopeKey,
      currentPage,
    ),
    queryFn: async () => {
      let cursor: QueryDocumentSnapshot<DocumentData> | null = null
      for (let p = 1; p < currentPage; p++) {
        const batch = await fetchQuestionRecordsPage({
          userUid: userUid!,
          showOnlyMine,
          bookId: selectedBookId || undefined,
          myOwnedBookIds,
          searchQuery,
          startAfterSnapshot: cursor,
        })
        if (batch.done || !batch.nextCursor) {
          return { records: [] as RecordContent[], done: true as const }
        }
        cursor = batch.nextCursor
      }
      return fetchQuestionRecordsPage({
        userUid: userUid!,
        showOnlyMine,
        bookId: selectedBookId || undefined,
        myOwnedBookIds,
        searchQuery,
        startAfterSnapshot: cursor,
      })
    },
    enabled: listReady,
    staleTime: 15_000,
  })

  const availableBooks: Book[] = booksQuery.data ?? []
  const records: RecordContent[] = recordsQuery.data?.records ?? []
  const isLoading = listReady && recordsQuery.isPending && !recordsQuery.data
  const error = recordsQuery.isError
    ? "독서 질문을 불러오는 중 오류가 발생했습니다."
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

  const showMineMultiBookHint =
    showOnlyMine &&
    !selectedBookId &&
    availableBooks.length > 30

  return (
    <div className='min-h-screen bg-theme-gradient pb-20'>
      <div className='container mx-auto px-4 py-6'>
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
            ❓ 독서 질문
          </h1>
          <p className='text-theme-secondary text-sm'>
            책에 대한 질문을 확인하고 답변해보세요
          </p>
        </header>

        <div className='bg-theme-secondary rounded-lg p-4 mb-6 shadow-sm border-card'>
          <div className='space-y-4'>
            <div>
              <label className='block text-sm font-medium text-theme-primary mb-2'>
                검색
              </label>
              <div className='relative'>
                <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400' />
                <input
                  type='text'
                  placeholder='질문 내용(앞부분 일치), 책 제목…'
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

            <div>
              <label className='block text-sm font-medium text-theme-primary mb-2'>
                책 선택
              </label>
              <div className='relative'>
                <Filter className='absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400' />
                <select
                  value={selectedBookId}
                  onChange={(e) => handleBookFilterChange(e.target.value)}
                  className='w-full pl-10 pr-10 py-2 border border-theme-tertiary rounded-lg bg-theme-primary text-theme-primary focus:outline-none focus:ring-2 focus:ring-accent-theme'
                >
                  <option value=''>전체 책 (내 서재)</option>
                  {availableBooks.map((book) => (
                    <option key={book.id} value={book.id}>
                      {book.title} {book.author ? `- ${book.author}` : ""}
                    </option>
                  ))}
                </select>
              </div>
            </div>

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

        {showMineMultiBookHint && (
          <div className='mb-4 rounded-lg border border-theme-tertiary bg-theme-secondary px-3 py-2 text-xs text-theme-secondary'>
            내 서재가 30권을 넘으면, 질문 목록은 먼저 불러온 30권의 책에 대해서만 모읍니다.
          </div>
        )}

        {error && (
          <div className='mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg'>
            <p className='text-red-700 dark:text-red-400 text-sm'>{error}</p>
          </div>
        )}

        {!listReady ? (
          <RecordListLoading variant='questions' />
        ) : showOnlyMine &&
          !selectedBookId &&
          booksQuery.isFetched &&
          availableBooks.length === 0 ? (
          <div className='text-center py-12'>
            <HelpCircle className='h-12 w-12 text-gray-400 mx-auto mb-4' />
            <h3 className='text-lg font-medium text-theme-primary mb-2'>
              내 서재에 책이 없습니다
            </h3>
            <p className='text-theme-secondary'>
              질문을 보려면 먼저 책을 등록해 주세요.
            </p>
          </div>
        ) : isLoading ? (
          <RecordListLoading variant='questions' />
        ) : records.length === 0 ? (
          <div className='text-center py-12'>
            <HelpCircle className='h-12 w-12 text-gray-400 mx-auto mb-4' />
            <h3 className='text-lg font-medium text-theme-primary mb-2'>
              독서 질문이 없습니다
            </h3>
            <p className='text-theme-secondary'>
              {showOnlyMine
                ? "아직 작성한 독서 질문이 없습니다."
                : "공개된 독서 질문이 없습니다."}
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
                <RecordContentCard
                  key={`${record.contentType}-${record.id}`}
                  content={record}
                />
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
