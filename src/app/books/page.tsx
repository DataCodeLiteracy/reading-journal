"use client"

import { useState, useEffect, useMemo, Suspense } from "react"
import {
  BookOpen,
  Plus,
  Search,
  X,
  Trash2,
  AlertCircle,
  Star,
  Filter,
  ChevronDown,
  ChevronUp,
} from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { Book, BOOK_LEVELS, BOOK_FIELDS, type BookLevel, type BookField } from "@/types/book"
import AddBookModal from "@/components/AddBookModal"
import ConfirmModal from "@/components/ConfirmModal"
import Pagination from "@/components/Pagination"
import { useAuth } from "@/contexts/AuthContext"
import { useData } from "@/contexts/DataContext"
import { BookService } from "@/services/bookService"
import { ApiError } from "@/lib/apiClient"
import { GenericRouteSkeleton, SkLine } from "@/components/skeletons"
import { normalizeBookTitleKey } from "@/utils/bookTitleKey"

export default function BooksPage() {
  return (
    <Suspense
      fallback={<GenericRouteSkeleton rows={6} />}
    >
      <BooksPageContent />
    </Suspense>
  )
}

function BooksPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, loading, isLoggedIn, userUid } = useAuth()
  const {
    allBooks,
    addBook,
    removeBook,
  } = useData()

  const userBookTitleKeys = useMemo(
    () => allBooks.map((b) => normalizeBookTitleKey(b.title)),
    [allBooks],
  )

  const [error, setError] = useState<string | null>(null)

  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)

  const [activeTab, setActiveTab] = useState<
    "reading" | "completed" | "want-to-read" | "on-hold"
  >("reading")

  const getDefaultSortForTab = (
    tab: "reading" | "completed" | "want-to-read" | "on-hold"
  ): "recently_added" | "recently_updated" | "recently_read" =>
    tab === "want-to-read" ? "recently_added" : "recently_read"

  const [sortOrder, setSortOrder] = useState<
    "recently_added" | "recently_updated" | "recently_read"
  >("recently_read")

  const [booksByLastRead, setBooksByLastRead] = useState<Book[]>([])
  const [loadingLastReadSort, setLoadingLastReadSort] = useState(false)

  const [searchQuery, setSearchQuery] = useState("")

  // 필터
  const [levelFilter, setLevelFilter] = useState<BookLevel | "">("")
  const [categoryFilter, setCategoryFilter] = useState<BookField | "">("")
  const [filterOpen, setFilterOpen] = useState(false)

  const [isAddBookModalOpen, setIsAddBookModalOpen] = useState(false)
  const [isDeleteBookModalOpen, setIsDeleteBookModalOpen] = useState(false)
  const [bookToDelete, setBookToDelete] = useState<Book | null>(null)
  const [isNavigating, setIsNavigating] = useState(false)

  const getTotalBooks = () => allBooks.length
  const getReadingBooks = () =>
    allBooks.filter((book) => book.status === "reading").length
  const getCompletedBooks = () =>
    allBooks.filter((book) => book.status === "completed").length
  const getWantToReadBooks = () =>
    allBooks.filter((book) => book.status === "want-to-read").length
  const getOnHoldBooks = () =>
    allBooks.filter((book) => book.status === "on-hold").length

  // URL ?tab= 에서 탭 복원 (전체 보기 등에서 진입 시)
  useEffect(() => {
    const tab = searchParams.get("tab")
    if (
      tab === "reading" ||
      tab === "completed" ||
      tab === "want-to-read" ||
      tab === "on-hold"
    ) {
      setActiveTab(tab)
      setSortOrder(getDefaultSortForTab(tab))
    }
  }, [searchParams])

  // "최근 읽은 순"일 때 API로 정렬된 목록 로드 (읽는 중/완독/보류)
  useEffect(() => {
    const useLastRead =
      (activeTab === "reading" || activeTab === "completed" || activeTab === "on-hold") &&
      sortOrder === "recently_read" &&
      !!userUid
    if (!useLastRead) {
      setBooksByLastRead([])
      return
    }
    let cancelled = false
    setLoadingLastReadSort(true)
    BookService.getUserBooksByStatusSortedByLastRead(userUid, activeTab)
      .then((books) => {
        if (!cancelled) setBooksByLastRead(books)
      })
      .catch(() => {
        if (!cancelled) setBooksByLastRead([])
      })
      .finally(() => {
        if (!cancelled) setLoadingLastReadSort(false)
      })
    return () => {
      cancelled = true
    }
  }, [activeTab, sortOrder, userUid])

  // 필터링된 책 목록 (탭 + 검색 + 레벨/분야 + 정렬)
  const filteredBooks = useMemo(() => {
    let list: Book[]

    const useLastReadList =
      (activeTab === "reading" || activeTab === "completed" || activeTab === "on-hold") &&
      sortOrder === "recently_read" &&
      booksByLastRead.length >= 0

    if (useLastReadList && booksByLastRead.length > 0) {
      list = [...booksByLastRead]
    } else {
      list = allBooks.filter((book) => book.status === activeTab)
      const getTime = (b: Book) => {
        if (sortOrder === "recently_added") {
          return (b.created_at ? new Date(b.created_at).getTime() : 0)
        }
        return (b.updated_at ? new Date(b.updated_at).getTime() : b.created_at ? new Date(b.created_at).getTime() : 0)
      }
      list.sort((a, b) => getTime(b) - getTime(a))
    }

    // 검색어 필터
    const q = searchQuery.trim().toLowerCase()
    if (q) {
      list = list.filter(
        (book) =>
          book.title.toLowerCase().includes(q) ||
          (book.author && book.author.toLowerCase().includes(q))
      )
    }

    // 레벨 필터
    if (levelFilter) {
      list = list.filter((book) => book.level === levelFilter)
    }

    // 분야 필터
    if (categoryFilter) {
      list = list.filter((book) => book.category === categoryFilter)
    }

    return list
  }, [allBooks, activeTab, searchQuery, levelFilter, categoryFilter, sortOrder, booksByLastRead])

  // 페이지네이션
  const totalItems = filteredBooks.length
  const paginatedBooks = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return filteredBooks.slice(start, start + itemsPerPage)
  }, [filteredBooks, currentPage, itemsPerPage])

  useEffect(() => {
    if (!loading && !isLoggedIn) {
      router.push("/login")
    }
  }, [isLoggedIn, loading, router])

  // 필터/정렬 변경 시 페이지 리셋
  useEffect(() => {
    setCurrentPage(1)
  }, [activeTab, searchQuery, levelFilter, categoryFilter, sortOrder])

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const handleTabChange = (
    tab: "reading" | "completed" | "want-to-read" | "on-hold"
  ) => {
    setActiveTab(tab)
    setSortOrder(getDefaultSortForTab(tab))
  }

  const handleBookClick = (bookId: string) => {
    setIsNavigating(true)
    router.push(`/book/${bookId}/${userUid || "1"}`)
  }

  const handleAddBook = async (newBook: Omit<Book, "id" | "user_id">) => {
    if (!userUid) return

    const key = normalizeBookTitleKey(newBook.title)
    if (allBooks.some((b) => normalizeBookTitleKey(b.title) === key)) {
      setError("이미 같은 제목으로 등록된 책이 있습니다.")
      return
    }

    try {
      setError(null)
      console.log("handleAddBook called with newBook:", newBook)
      console.log("userUid:", userUid)

      const bookData = {
        ...newBook,
        user_id: userUid,
      }
      console.log("bookData to be created:", bookData)

      const createdBook = await BookService.createBook(bookData)
      console.log("Book created:", createdBook)

      if (newBook.status === "want-to-read") {
        setActiveTab("want-to-read")
      } else if (newBook.status === "reading") {
        setActiveTab("reading")
      } else if (newBook.status === "completed") {
        setActiveTab("completed")
      }

      addBook(createdBook)

      setCurrentPage(1)
    } catch (error) {
      console.error("handleAddBook error:", error)
      if (error instanceof ApiError) {
        setError(error.message)
      } else {
        setError("책을 추가하는 중 오류가 발생했습니다.")
      }
    }
  }

  const handleBookStatusUpdate = async (
    bookId: string,
    newStatus: Book["status"]
  ) => {
    if (!userUid) return

    try {
      setError(null)
      await BookService.updateBookStatus(bookId, newStatus, userUid)

      removeBook(bookId)
    } catch (error) {
      if (error instanceof ApiError) {
        setError(error.message)
      } else {
        setError("책 상태를 업데이트하는 중 오류가 발생했습니다.")
      }
    }
  }

  const handleDeleteBook = async (bookId: string) => {
    const book = allBooks.find((b) => b.id === bookId)
    if (book) {
      setBookToDelete(book)
      setIsDeleteBookModalOpen(true)
    }
  }

  const confirmDeleteBook = async () => {
    if (!userUid || !bookToDelete) return

    try {
      setError(null)
      await BookService.deleteBook(bookToDelete.id)

      removeBook(bookToDelete.id)
    } catch (error) {
      if (error instanceof ApiError) {
        setError(error.message)
      } else {
        setError("책을 삭제하는 중 오류가 발생했습니다.")
      }
    } finally {
      setBookToDelete(null)
    }
  }

  if (loading) {
    return <GenericRouteSkeleton rows={6} />
  }

  if (!isLoggedIn) {
    return null
  }

  return (
    <div className='min-h-screen bg-theme-gradient pb-20'>
      <div className='container mx-auto px-4 py-6'>
        <header className='mb-6'>
          <div className='flex items-center justify-between mb-2'>
            <h1 className='text-3xl font-bold text-theme-primary'>
              📚 내 책 목록
            </h1>
            <div className='bg-theme-secondary rounded-lg px-4 py-2 shadow-sm border-card'>
              <p className='text-sm text-theme-secondary'>
                총 <span className='font-bold text-theme-primary text-lg'>{getTotalBooks()}</span>권
              </p>
            </div>
          </div>
          <p className='text-theme-secondary text-sm'>
            읽고 있는 책, 완독한 책, 읽고 싶은 책을 관리하세요
          </p>
        </header>

        {error && (
          <div className='mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg'>
            <div className='flex items-center gap-2'>
              <AlertCircle className='h-5 w-5 text-red-500' />
              <p className='text-red-700 dark:text-red-400 text-sm'>{error}</p>
            </div>
          </div>
        )}

        <div className='flex space-x-1 bg-theme-secondary rounded-lg p-1 mb-4 shadow-sm border-card'>
          {[
            {
              key: "reading",
              label: "읽는 중",
              count: getReadingBooks(),
            },
            {
              key: "completed",
              label: "완독",
              count: getCompletedBooks(),
            },
            {
              key: "want-to-read",
              label: "읽고 싶은 책",
              count: getWantToReadBooks(),
            },
            {
              key: "on-hold",
              label: "보류",
              count: getOnHoldBooks(),
            },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() =>
                handleTabChange(
                  tab.key as
                    | "reading"
                    | "completed"
                    | "want-to-read"
                    | "on-hold"
                )
              }
              className={`flex-1 py-2 px-2 rounded-md text-xs font-medium transition-colors ${
                activeTab === tab.key
                  ? "bg-accent-theme text-white"
                  : "text-theme-secondary hover:text-theme-primary"
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>

        {/* 검색 섹션 */}
        <div className='mb-4'>
          <div className='relative'>
            <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400' />
            <input
              type='text'
              placeholder='책 제목이나 저자로 검색...'
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className='w-full pl-10 pr-10 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-accent-theme focus:border-transparent'
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className='absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 hover:text-gray-600 transition-colors'
                title='검색어 지우기'
              >
                <X className='h-4 w-4' />
              </button>
            )}
          </div>
        </div>

        {/* 정렬 */}
        <div className='mb-4'>
          <label className='block text-xs text-theme-tertiary mb-1'>정렬</label>
          <select
            value={sortOrder}
            onChange={(e) =>
              setSortOrder(
                e.target.value as
                  | "recently_added"
                  | "recently_updated"
                  | "recently_read"
              )
            }
            className='w-full rounded-lg border border-theme-tertiary bg-theme-primary px-3 py-2 text-sm text-theme-primary focus:outline-none focus:ring-2 focus:ring-accent-theme'
          >
            <option value='recently_added'>최근 등록한 순</option>
            <option value='recently_updated'>최근 수정한 순</option>
            {(activeTab === "reading" || activeTab === "completed" || activeTab === "on-hold") && (
              <option value='recently_read'>최근 읽은 순</option>
            )}
          </select>
        </div>

        {/* 필터 토글 */}
        <div className='bg-theme-secondary rounded-lg mb-4 shadow-sm border-card overflow-hidden'>
          <button
            type='button'
            onClick={() => setFilterOpen((o) => !o)}
            className='w-full flex items-center justify-between gap-2 pl-4 pr-6 py-3 text-left text-theme-primary font-medium hover:bg-theme-tertiary/50 transition-colors'
          >
            <span className='flex items-center gap-2 text-sm'>
              <Filter className='h-4 w-4' />
              필터
              {(levelFilter || categoryFilter) && (
                <span className='text-xs font-normal text-accent-theme'>
                  · 적용됨
                </span>
              )}
            </span>
            {filterOpen ? (
              <ChevronUp className='h-4 w-4 shrink-0 text-theme-tertiary' />
            ) : (
              <ChevronDown className='h-4 w-4 shrink-0 text-theme-tertiary' />
            )}
          </button>
          {filterOpen && (
            <div className='px-4 pb-4 pt-0 border-t border-theme-tertiary/50'>
              <div className='grid grid-cols-2 gap-3 pt-3'>
                <div>
                  <label className='block text-xs text-theme-tertiary mb-1'>레벨</label>
                  <select
                    value={levelFilter}
                    onChange={(e) => setLevelFilter(e.target.value as BookLevel | "")}
                    className='w-full rounded-lg border border-theme-tertiary bg-theme-primary px-3 py-2 text-sm text-theme-primary'
                  >
                    <option value=''>전체</option>
                    {BOOK_LEVELS.map((l) => (
                      <option key={l} value={l}>
                        {l}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className='block text-xs text-theme-tertiary mb-1'>분야</label>
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value as BookField | "")}
                    className='w-full rounded-lg border border-theme-tertiary bg-theme-primary px-3 py-2 text-sm text-theme-primary'
                  >
                    <option value=''>전체</option>
                    {BOOK_FIELDS.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              {(levelFilter || categoryFilter) && (
                <button
                  type='button'
                  onClick={() => {
                    setLevelFilter("")
                    setCategoryFilter("")
                  }}
                  className='mt-3 text-xs text-accent-theme hover:underline'
                >
                  필터 초기화
                </button>
              )}
            </div>
          )}
        </div>

        {/* 새 책 추가 버튼 */}
        <div className='mb-4'>
          <button
            onClick={() => setIsAddBookModalOpen(true)}
            className='flex items-center gap-2 bg-accent-theme hover:bg-accent-theme-secondary text-white px-4 py-3 rounded-lg transition-colors w-full justify-center'
          >
            <Plus className='h-5 w-5' />새 책 추가
          </button>
        </div>

        {paginatedBooks.length === 0 ? (
          <div className='text-center py-12'>
            <BookOpen className='h-12 w-12 text-gray-400 mx-auto mb-4' />
            <h3 className='text-lg font-medium text-theme-primary mb-2'>
              {searchQuery || levelFilter || categoryFilter
                ? "검색 결과가 없습니다"
                : getTotalBooks() === 0
                ? "아직 등록된 책이 없습니다"
                : activeTab === "reading"
                ? "읽고 있는 책이 없습니다"
                : activeTab === "completed"
                ? "완독한 책이 없습니다"
                : activeTab === "on-hold"
                ? "보류 중인 책이 없습니다"
                : "읽고 싶은 책이 없습니다"}
            </h3>
            <p className='text-theme-secondary mb-4'>
              {searchQuery || levelFilter || categoryFilter
                ? "다른 검색어나 필터를 시도해보세요."
                : getTotalBooks() === 0
                ? "새로운 책을 추가해보세요!"
                : activeTab === "reading"
                ? "책을 읽기 시작하면 여기에 표시됩니다"
                : activeTab === "completed"
                ? "책을 완독하면 여기에 표시됩니다"
                : activeTab === "on-hold"
                ? "책을 보류하면 여기에 표시됩니다"
                : "새로운 책을 추가해보세요!"}
            </p>
            {(getTotalBooks() === 0 ||
              activeTab === "want-to-read" ||
              (searchQuery || levelFilter || categoryFilter)) && (
              <button
                onClick={() => setIsAddBookModalOpen(true)}
                className='inline-flex items-center gap-2 bg-accent-theme hover:bg-accent-theme-secondary text-white px-4 py-2 rounded-lg transition-colors'
              >
                <Plus className='h-4 w-4' />
                {getTotalBooks() === 0 ? "첫 번째 책 추가하기" : "책 추가하기"}
              </button>
            )}
          </div>
        ) : (
          <div className='grid grid-cols-1 gap-3'>
            {paginatedBooks.map((book: Book) => (
              <div
                key={book.id}
                onClick={() => handleBookClick(book.id)}
                className='bg-theme-secondary rounded-lg shadow-sm border-card hover:shadow-md transition-shadow p-3 cursor-pointer relative group'
              >
                <div className='flex items-start gap-3'>
                  <div className='w-14 h-18 bg-theme-tertiary rounded-md flex items-center justify-center flex-shrink-0'>
                    <BookOpen className='h-7 w-7 text-gray-400' />
                  </div>
                  <div className='flex-1 min-w-0'>
                    <div className='flex items-start justify-between mb-2'>
                      <div className='flex-1 min-w-0'>
                        <h3 className='font-semibold text-theme-primary mb-1 truncate'>
                          {book.title}
                        </h3>
                        <p className='text-sm text-theme-secondary truncate'>
                          {book.author || "저자 미상"}
                        </p>
                      </div>
                      <div className='flex items-center gap-1 ml-2'>
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`h-3 w-3 ${
                              i < book.rating
                                ? "text-yellow-400 fill-current"
                                : "text-gray-300"
                            }`}
                          />
                        ))}
                      </div>
                    </div>

                    <div className='flex items-center justify-between text-xs text-theme-tertiary'>
                      <span className='text-xs'>
                        {book.publishedDate || book.startDate}
                      </span>
                      <span
                        className={`px-2 py-1 rounded-full text-xs ${
                          book.status === "reading"
                            ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                            : book.status === "completed"
                            ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                            : book.status === "on-hold"
                            ? "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200"
                            : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200"
                        }`}
                      >
                        {book.status === "reading"
                          ? "읽는 중"
                          : book.status === "completed"
                          ? "완독"
                          : book.status === "on-hold"
                          ? "보류"
                          : "읽고 싶음"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 페이지네이션 */}
        {paginatedBooks.length > 0 && (
          <div className='mt-8 mb-8 pb-8'>
            <Pagination
              currentPage={currentPage}
              totalPages={Math.ceil(totalItems / itemsPerPage)}
              onPageChange={handlePageChange}
              totalItems={totalItems}
              itemsPerPage={itemsPerPage}
            />
          </div>
        )}
      </div>

      <AddBookModal
        isOpen={isAddBookModalOpen}
        onClose={() => setIsAddBookModalOpen(false)}
        onAddBook={handleAddBook}
        userBookTitleKeys={userBookTitleKeys}
      />

      {/* 책 삭제 확인 모달 */}
      <ConfirmModal
        isOpen={isDeleteBookModalOpen}
        onClose={() => setIsDeleteBookModalOpen(false)}
        onConfirm={confirmDeleteBook}
        title='책 삭제'
        message={`"${bookToDelete?.title}" 책과 관련된 모든 독서 기록을 삭제하시겠습니까?`}
        confirmText='삭제'
        cancelText='취소'
        icon={Trash2}
      />

      {isNavigating && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          aria-busy="true"
          aria-label="페이지 이동 중"
        >
          <span className="sr-only">페이지 이동 중</span>
          <div className="w-[min(100%-2rem,20rem)] space-y-3 rounded-xl border border-white/10 bg-theme-secondary/95 p-6 shadow-xl dark:bg-theme-primary/95">
            <SkLine className="h-4 w-3/4" />
            <SkLine className="h-4 w-full" />
            <SkLine className="h-4 w-5/6" />
          </div>
        </div>
      )}
    </div>
  )
}

