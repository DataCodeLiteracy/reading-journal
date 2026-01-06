"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { PenSquare, Search, Filter, X, Globe, User, ArrowLeft } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { RecordService, RecordContent } from "@/services/recordService"
import { Book } from "@/types/book"
import RecordContentCard from "@/components/RecordContentCard"
import Pagination from "@/components/Pagination"

export default function QuotesPage() {
  const router = useRouter()
  const { isLoggedIn, loading, userUid } = useAuth()
  const [records, setRecords] = useState<RecordContent[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 필터 및 검색 상태
  const [selectedBookId, setSelectedBookId] = useState<string>("")
  const [searchQuery, setSearchQuery] = useState("")
  const [showOnlyMine, setShowOnlyMine] = useState(true) // 기본값: 내 데이터만 보기

  // 페이지네이션
  const [currentPage, setCurrentPage] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const [itemsPerPage] = useState(20)

  // 책 목록 (필터용)
  const [availableBooks, setAvailableBooks] = useState<Book[]>([])

  useEffect(() => {
    if (!loading && !isLoggedIn) {
      router.push("/login")
    }
  }, [isLoggedIn, loading, router])

  // 책 목록 로드
  useEffect(() => {
    if (!isLoggedIn || !userUid) return

    const loadBooks = async () => {
      try {
        const books = await RecordService.getAvailableBooks(userUid, showOnlyMine)
        setAvailableBooks(books)
      } catch (error) {
        console.error("Error loading books:", error)
      }
    }

    loadBooks()
  }, [isLoggedIn, userUid, showOnlyMine])

  // 기록 로드
  useEffect(() => {
    if (!isLoggedIn || !userUid) return

    const loadRecords = async () => {
      try {
        setIsLoading(true)
        setError(null)

        const result = await RecordService.getAllRecords(
          userUid,
          "quote",
          selectedBookId || undefined,
          searchQuery || undefined,
          showOnlyMine,
          currentPage,
          itemsPerPage
        )

        setRecords(result.records)
        setTotalItems(result.total)
      } catch (error) {
        console.error("Error loading records:", error)
        setError("구절 기록을 불러오는 중 오류가 발생했습니다.")
      } finally {
        setIsLoading(false)
      }
    }

    loadRecords()
  }, [isLoggedIn, userUid, selectedBookId, searchQuery, showOnlyMine, currentPage, itemsPerPage])

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const handleBookFilterChange = (bookId: string) => {
    setSelectedBookId(bookId)
    setCurrentPage(1)
  }

  const handleSearchChange = (query: string) => {
    setSearchQuery(query)
    setCurrentPage(1)
  }

  const handleToggleShowOnlyMine = () => {
    setShowOnlyMine(!showOnlyMine)
    setCurrentPage(1)
  }

  if (loading) {
    return (
      <div className='min-h-screen bg-theme-gradient flex items-center justify-center pb-20'>
        <div className='text-center'>
          <PenSquare className='h-12 w-12 text-gray-400 mx-auto mb-4 animate-pulse' />
          <p className='text-theme-secondary'>로딩 중...</p>
        </div>
      </div>
    )
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
        <div className='bg-theme-secondary rounded-lg p-4 mb-6 shadow-sm'>
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
                  className='w-full pl-10 pr-10 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-accent-theme focus:border-transparent'
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
                <Filter className='absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400' />
                <select
                  value={selectedBookId}
                  onChange={(e) => handleBookFilterChange(e.target.value)}
                  className='w-full pl-10 pr-10 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-accent-theme focus:border-transparent'
                >
                  <option value=''>전체 책</option>
                  {availableBooks.map((book) => (
                    <option key={book.id} value={book.id}>
                      {book.title} {book.author ? `- ${book.author}` : ""}
                    </option>
                  ))}
                </select>
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
          <div className='text-center py-12'>
            <PenSquare className='h-12 w-12 text-gray-400 mx-auto mb-4 animate-pulse' />
            <p className='text-theme-secondary'>구절 기록을 불러오는 중...</p>
          </div>
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
                총 {totalItems}개의 구절 기록
              </p>
            </div>
            <div className='space-y-4 mb-6'>
              {records.map((record) => (
                <RecordContentCard key={`${record.contentType}-${record.id}`} content={record} />
              ))}
            </div>

            {/* 페이지네이션 */}
            {totalItems > itemsPerPage && (
              <Pagination
                currentPage={currentPage}
                totalPages={Math.ceil(totalItems / itemsPerPage)}
                onPageChange={handlePageChange}
                totalItems={totalItems}
                itemsPerPage={itemsPerPage}
              />
            )}
          </>
        )}
      </div>
    </div>
  )
}

