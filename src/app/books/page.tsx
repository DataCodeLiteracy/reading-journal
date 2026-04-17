"use client"

import { useState, useEffect, useMemo, Suspense } from "react"
import type { DocumentData, QueryDocumentSnapshot } from "firebase/firestore"
import { useQuery, useQueryClient } from "@tanstack/react-query"
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
import OwnBookDuplicateModal from "@/components/OwnBookDuplicateModal"
import ConfirmModal from "@/components/ConfirmModal"
import { useAuth } from "@/contexts/AuthContext"
import { useData } from "@/contexts/DataContext"
import { BookService } from "@/services/bookService"
import { ApiError } from "@/lib/apiClient"
import { queryKeys } from "@/lib/queryKeys"
import { GenericRouteSkeleton, SkLine } from "@/components/skeletons"
import Pagination from "@/components/Pagination"
import { normalizeBookTitleKey } from "@/utils/bookTitleKey"
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock"

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
  const queryClient = useQueryClient()
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

  const [searchQuery, setSearchQuery] = useState("")
  const [currentPage, setCurrentPage] = useState(1)

  // 필터
  const [levelFilter, setLevelFilter] = useState<BookLevel | "">("")
  const [categoryFilter, setCategoryFilter] = useState<BookField | "">("")
  const [filterOpen, setFilterOpen] = useState(false)

  const [isAddBookModalOpen, setIsAddBookModalOpen] = useState(false)
  const [isDeleteBookModalOpen, setIsDeleteBookModalOpen] = useState(false)
  const [bookToDelete, setBookToDelete] = useState<Book | null>(null)
  const [isNavigating, setIsNavigating] = useState(false)
  const [duplicateModalOpen, setDuplicateModalOpen] = useState(false)
  const [duplicateModalTitle, setDuplicateModalTitle] = useState("")

  useBodyScrollLock(isNavigating)

  const countsQuery = useQuery({
    queryKey: queryKeys.user.libraryCounts(userUid!),
    queryFn: async () => {
      const uid = userUid!
      const [total, reading, completed, want, onHoldCount] = await Promise.all([
        BookService.countUserBooksTotal(uid),
        BookService.countUserBooksByStatus(uid, "reading"),
        BookService.countUserBooksByStatus(uid, "completed"),
        BookService.countUserBooksByStatus(uid, "want-to-read"),
        BookService.countUserBooksByStatus(uid, "on-hold"),
      ])
      return { total, reading, completed, want, onHold: onHoldCount }
    },
    enabled: Boolean(userUid),
    staleTime: 30_000,
  })

  const PAGE_SIZE = 10

  const titlePrefix = useMemo(() => {
    const t = searchQuery.trim()
    return t.length > 0 ? t : undefined
  }, [searchQuery])

  const tabCountQuery = useQuery({
    queryKey: queryKeys.user.libraryTabCount(
      userUid!,
      activeTab,
      levelFilter,
      categoryFilter,
      titlePrefix ?? "",
    ),
    queryFn: () =>
      BookService.countUserBooksByStatus(userUid!, activeTab, {
        level: levelFilter || undefined,
        category: categoryFilter || undefined,
        titlePrefix,
      }),
    enabled: Boolean(userUid),
    staleTime: 15_000,
  })

  const totalPages = Math.max(
    1,
    Math.ceil((tabCountQuery.data ?? 0) / PAGE_SIZE),
  )

  const booksPageQuery = useQuery({
    queryKey: queryKeys.user.libraryPage(
      userUid!,
      activeTab,
      sortOrder,
      levelFilter,
      categoryFilter,
      titlePrefix ?? "",
      currentPage,
    ),
    queryFn: async () => {
      let cursor: QueryDocumentSnapshot<DocumentData> | null = null
      for (let p = 1; p < currentPage; p++) {
        const batch = await BookService.queryUserBooksByStatusPage({
          user_id: userUid!,
          status: activeTab,
          sort: sortOrder,
          level: levelFilter || undefined,
          category: categoryFilter || undefined,
          titlePrefix,
          pageSize: PAGE_SIZE,
          startAfterSnapshot: cursor,
        })
        if (!batch.hasMore) {
          return { items: [] as Book[], hasMore: false }
        }
        cursor = batch.lastVisible
      }
      return BookService.queryUserBooksByStatusPage({
        user_id: userUid!,
        status: activeTab,
        sort: sortOrder,
        level: levelFilter || undefined,
        category: categoryFilter || undefined,
        titlePrefix,
        pageSize: PAGE_SIZE,
        startAfterSnapshot: cursor,
      })
    },
    enabled: Boolean(userUid),
    staleTime: 15_000,
  })

  const visibleBooks = booksPageQuery.data?.items ?? []

  useEffect(() => {
    setCurrentPage(1)
  }, [activeTab, sortOrder, levelFilter, categoryFilter, titlePrefix])

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [currentPage, totalPages])

  const getTotalBooks = () => countsQuery.data?.total ?? 0
  const getReadingBooks = () => countsQuery.data?.reading ?? 0
  const getCompletedBooks = () => countsQuery.data?.completed ?? 0
  const getWantToReadBooks = () => countsQuery.data?.want ?? 0
  const getOnHoldBooks = () => countsQuery.data?.onHold ?? 0

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

  useEffect(() => {
    if (!loading && !isLoggedIn) {
      router.push("/login")
    }
  }, [isLoggedIn, loading, router])

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
      setDuplicateModalTitle(newBook.title.trim())
      setDuplicateModalOpen(true)
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
      void queryClient.invalidateQueries({
        queryKey: queryKeys.user.libraryRoot(userUid),
      })
      void queryClient.invalidateQueries({
        queryKey: queryKeys.user.libraryCounts(userUid),
      })
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
      void queryClient.invalidateQueries({
        queryKey: queryKeys.user.libraryRoot(userUid),
      })
      void queryClient.invalidateQueries({
        queryKey: queryKeys.user.libraryCounts(userUid),
      })
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
      void queryClient.invalidateQueries({
        queryKey: queryKeys.user.libraryRoot(userUid),
      })
      void queryClient.invalidateQueries({
        queryKey: queryKeys.user.libraryCounts(userUid),
      })
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
          <p className='text-xs text-theme-tertiary mb-1'>
            검색어를 입력하면 제목이 그 글자로 시작하는 책만 서버에서 불러옵니다.
          </p>
          <div className='relative'>
            <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400' />
            <input
              type='text'
              placeholder='제목으로 검색 (앞부분 일치)...'
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

        {(booksPageQuery.isError || tabCountQuery.isError) && (
          <div className='mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-sm text-red-700 dark:text-red-300'>
            목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.
          </div>
        )}

        {booksPageQuery.isPending && !booksPageQuery.data ? (
          <GenericRouteSkeleton rows={4} />
        ) : visibleBooks.length === 0 ? (
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
            {visibleBooks.map((book: Book) => (
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

        {(tabCountQuery.data ?? 0) > 0 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            totalItems={tabCountQuery.data ?? 0}
            itemsPerPage={PAGE_SIZE}
          />
        )}
      </div>

      <AddBookModal
        isOpen={isAddBookModalOpen}
        onClose={() => setIsAddBookModalOpen(false)}
        onAddBook={handleAddBook}
        userBookTitleKeys={userBookTitleKeys}
      />

      <OwnBookDuplicateModal
        isOpen={duplicateModalOpen}
        onClose={() => setDuplicateModalOpen(false)}
        title={duplicateModalTitle}
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
          className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden overscroll-none bg-theme-backdrop"
          aria-busy="true"
          aria-label="페이지 이동 중"
        >
          <span className="sr-only">페이지 이동 중</span>
          <div className="modal-dialog-surface w-[min(100%-2rem,20rem)] space-y-3 rounded-xl p-6">
            <SkLine className="h-4 w-3/4" />
            <SkLine className="h-4 w-full" />
            <SkLine className="h-4 w-5/6" />
          </div>
        </div>
      )}
    </div>
  )
}

