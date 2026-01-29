"use client"

import { useState, useEffect } from "react"
import {
  BookOpen,
  Plus,
  Search,
  X,
  Trash2,
  AlertCircle,
  Star,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { Book } from "@/types/book"
import AddBookModal from "@/components/AddBookModal"
import ConfirmModal from "@/components/ConfirmModal"
import Pagination from "@/components/Pagination"
import { useAuth } from "@/contexts/AuthContext"
import { useData } from "@/contexts/DataContext"
import { BookService } from "@/services/bookService"
import { ApiError } from "@/lib/apiClient"

export default function BooksPage() {
  const router = useRouter()
  const { user, loading, isLoggedIn, userUid } = useAuth()
  const {
    allBooks,
    addBook,
    removeBook,
  } = useData()

  const [books, setBooks] = useState<Book[]>([])
  const [error, setError] = useState<string | null>(null)

  const [currentPage, setCurrentPage] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const [itemsPerPage] = useState(10)

  const [activeTab, setActiveTab] = useState<
    "reading" | "completed" | "want-to-read" | "on-hold"
  >("reading")

  const [searchQuery, setSearchQuery] = useState("")

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

  // 검색 상태 관리
  const [isSearching, setIsSearching] = useState(false)

  useEffect(() => {
    if (!loading && !isLoggedIn) {
      router.push("/login")
    }
  }, [isLoggedIn, loading, router])

  useEffect(() => {
    if (!isLoggedIn || !userUid) return

    const loadBooks = async () => {
      try {
        setError(null)

        if (!userUid) {
          setError("사용자 정보를 찾을 수 없습니다. 다시 로그인해주세요.")
          return
        }

        console.log("Loading books for user_id:", userUid)

        // 검색어가 있으면 검색 API 사용, 없으면 일반 페이지네이션 API 사용
        // '읽는 중' 탭일 때는 최근 읽은 기록 순으로 정렬
        const sortByLastRead = activeTab === "reading"
        const booksData = searchQuery.trim()
          ? await BookService.searchUserBooksByStatus(
              userUid,
              activeTab,
              searchQuery,
              currentPage,
              itemsPerPage,
              sortByLastRead
            )
          : await BookService.getUserBooksByStatusPaginated(
              userUid,
              activeTab,
              currentPage,
              itemsPerPage,
              sortByLastRead
            )

        console.log("Loaded books data:", {
          booksCount: booksData.books.length,
          totalItems: booksData.total,
          isSearching: !!searchQuery.trim(),
        })

        setBooks(booksData.books)
        setTotalItems(booksData.total)
        setIsSearching(!!searchQuery.trim())
      } catch (error) {
        console.error("Error loading books:", error)
        if (error instanceof ApiError) {
          setError(error.message)
        } else {
          setError("책 목록을 불러오는 중 오류가 발생했습니다.")
        }
      }
    }

    loadBooks()
  }, [isLoggedIn, userUid, activeTab, currentPage, itemsPerPage, searchQuery])

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const handleTabChange = (
    tab: "reading" | "completed" | "want-to-read" | "on-hold"
  ) => {
    setActiveTab(tab)
    setCurrentPage(1)
    // 탭 변경 시 검색어는 유지하되, 페이지는 1로 리셋
  }

  const handleBookClick = (bookId: string) => {
    setIsNavigating(true)
    router.push(`/book/${bookId}/${userUid || "1"}`)
  }

  const handleAddBook = async (newBook: Omit<Book, "id" | "user_id">) => {
    if (!userUid) return

    try {
      setError(null)
      console.log("handleAddBook called with newBook:", newBook)
      console.log("userUid:", userUid)

      const bookData = {
        ...newBook,
        user_id: userUid,
      }
      console.log("bookData to be created:", bookData)

      const bookId = await BookService.createBook(bookData)
      console.log("Book created with ID:", bookId)

      const createdBook: Book = {
        ...bookData,
        id: bookId,
      }
      console.log("createdBook:", createdBook)

      if (newBook.status === "want-to-read") {
        setActiveTab("want-to-read")
      } else if (newBook.status === "reading") {
        setActiveTab("reading")
      } else if (newBook.status === "completed") {
        setActiveTab("completed")
      }

      setBooks((prev) => [createdBook, ...prev])
      addBook(createdBook)

      setTotalItems((prev) => prev + 1)
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

      setBooks((prev) => prev.filter((book) => book.id !== bookId))
      removeBook(bookId)

      if (books.length === 1 && currentPage > 1) {
        setCurrentPage((prev) => prev - 1)
      }
    } catch (error) {
      if (error instanceof ApiError) {
        setError(error.message)
      } else {
        setError("책 상태를 업데이트하는 중 오류가 발생했습니다.")
      }
    }
  }

  const handleDeleteBook = async (bookId: string) => {
    const book = books.find((b) => b.id === bookId)
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

      setBooks((prev) => prev.filter((book) => book.id !== bookToDelete.id))
      removeBook(bookToDelete.id)

      setTotalItems((prev) => prev - 1)

      if (books.length === 1 && currentPage > 1) {
        setCurrentPage((prev) => prev - 1)
      }
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
    return (
      <div className='min-h-screen bg-theme-gradient flex items-center justify-center'>
        <div className='text-center'>
          <BookOpen className='h-12 w-12 text-gray-400 mx-auto mb-4 animate-pulse' />
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
        <header className='mb-6'>
          <div className='flex items-center justify-between mb-2'>
            <h1 className='text-3xl font-bold text-theme-primary'>
              📚 내 책 목록
            </h1>
            <div className='bg-theme-secondary rounded-lg px-4 py-2 shadow-sm'>
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

        <div className='flex space-x-1 bg-theme-secondary rounded-lg p-1 mb-4 shadow-sm'>
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
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setCurrentPage(1) // 검색어 변경 시 페이지를 1로 리셋
              }}
              className='w-full pl-10 pr-10 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-accent-theme focus:border-transparent'
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery("")
                  setCurrentPage(1)
                }}
                className='absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 hover:text-gray-600 transition-colors'
                title='검색어 지우기'
              >
                <X className='h-4 w-4' />
              </button>
            )}
          </div>
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

        {books.length === 0 ? (
          <div className='text-center py-12'>
            <BookOpen className='h-12 w-12 text-gray-400 mx-auto mb-4' />
            <h3 className='text-lg font-medium text-theme-primary mb-2'>
              {isSearching
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
              {isSearching
                ? `"${searchQuery}"에 대한 검색 결과가 없습니다. 다른 검색어를 시도해보세요.`
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
              isSearching) && (
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
            {books.map((book: Book) => (
              <div
                key={book.id}
                onClick={() => handleBookClick(book.id)}
                className='bg-theme-secondary rounded-lg shadow-sm hover:shadow-md transition-shadow p-3 cursor-pointer relative group'
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
        {books.length > 0 && (
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

      {/* 로딩 Backdrop */}
      {isNavigating && (
        <div className='fixed inset-0 bg-black/60 dark:bg-black/75 flex items-center justify-center z-50'>
          <div className='animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent' />
        </div>
      )}
    </div>
  )
}

