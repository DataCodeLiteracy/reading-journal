"use client"

import { useState, useEffect } from "react"
import {
  BookOpen,
  Plus,
  Search,
  Calendar,
  Star,
  Bookmark,
  AlertCircle,
  Clock,
  TrendingUp,
  Target,
  Trash2,
  CheckCircle,
  User,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { Book } from "@/types/book"
import { UserStatistics } from "@/types/user"
import AddBookModal from "@/components/AddBookModal"
import ConfirmModal from "@/components/ConfirmModal"
import Pagination from "@/components/Pagination"
import { useAuth } from "@/contexts/AuthContext"
import { useSettings } from "@/contexts/SettingsContext"
import { BookService } from "@/services/bookService"
import { UserStatisticsService } from "@/services/userStatisticsService"
import { ApiError } from "@/lib/apiClient"

export default function Home() {
  const router = useRouter()
  const { user, loading, isLoggedIn, userUid } = useAuth()
  const { settings } = useSettings()
  const [books, setBooks] = useState<Book[]>([])
  const [allBooks, setAllBooks] = useState<Book[]>([])
  const [userStatistics, setUserStatistics] = useState<UserStatistics | null>(
    null
  )
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [currentPage, setCurrentPage] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const [itemsPerPage] = useState(10)

  const [activeTab, setActiveTab] = useState<
    "reading" | "completed" | "want-to-read"
  >("reading")

  const [isAddBookModalOpen, setIsAddBookModalOpen] = useState(false)
  const [isDeleteBookModalOpen, setIsDeleteBookModalOpen] = useState(false)
  const [bookToDelete, setBookToDelete] = useState<Book | null>(null)

  const getTotalBooks = () => allBooks.length
  const getReadingBooks = () =>
    allBooks.filter((book) => book.status === "reading").length
  const getCompletedBooks = () =>
    allBooks.filter((book) => book.status === "completed").length
  const getWantToReadBooks = () =>
    allBooks.filter((book) => book.status === "want-to-read").length
  const getAverageRating = () => {
    if (allBooks.length === 0) return 0
    const totalRating = allBooks.reduce((acc, book) => acc + book.rating, 0)
    return totalRating / allBooks.length
  }

  useEffect(() => {
    if (!loading && !isLoggedIn) {
      router.push("/login")
    }
  }, [isLoggedIn, loading, router])

  useEffect(() => {
    if (!isLoggedIn || !userUid) return

    const loadBooks = async () => {
      try {
        setIsLoading(true)
        setError(null)

        if (!userUid) {
          setError("사용자 정보를 찾을 수 없습니다. 다시 로그인해주세요.")
          return
        }

        console.log("Loading books and user data for user_id:", userUid)

        const [booksData, allBooksData, statisticsData] = await Promise.all([
          BookService.getUserBooksByStatusPaginated(
            userUid,
            activeTab,
            currentPage,
            itemsPerPage
          ),
          BookService.getUserBooks(userUid),
          UserStatisticsService.getUserStatistics(userUid),
        ])

        console.log("Loaded data:", {
          booksCount: booksData.books.length,
          totalItems: booksData.total,
          allBooksCount: allBooksData.length,
          statistics: statisticsData,
        })

        setBooks(booksData.books)
        setAllBooks(allBooksData)
        setTotalItems(booksData.total)
        setUserStatistics(statisticsData)
      } catch (error) {
        console.error("Error loading data:", error)
        if (error instanceof ApiError) {
          if (error.code === "PERMISSION_DENIED") {
            setError(
              "데이터에 접근할 권한이 없습니다. 로그인을 다시 시도해주세요."
            )
          } else if (error.code === "NETWORK_ERROR") {
            setError("네트워크 연결을 확인해주세요.")
          } else if (error.code === "INDEX_ERROR") {
            setError(
              "데이터베이스 인덱스가 필요합니다. 잠시 후 다시 시도해주세요."
            )
          } else {
            setError(error.message)
          }
        } else {
          setError("데이터를 불러오는 중 오류가 발생했습니다.")
        }
      } finally {
        setIsLoading(false)
      }
    }

    loadBooks()
  }, [isLoggedIn, userUid, activeTab, currentPage, itemsPerPage])

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const handleTabChange = (tab: "reading" | "completed" | "want-to-read") => {
    setActiveTab(tab)
    setCurrentPage(1)

    if (userUid) {
      const loadTabData = async () => {
        try {
          setIsLoading(true)
          setError(null)

          const [booksData, allBooksData] = await Promise.all([
            BookService.getUserBooksByStatusPaginated(
              userUid,
              tab,
              1,
              itemsPerPage
            ),
            BookService.getUserBooks(userUid),
          ])

          setBooks(booksData.books)
          setAllBooks(allBooksData)
          setTotalItems(booksData.total)
        } catch (error) {
          console.error("Error loading tab data:", error)
          if (error instanceof ApiError) {
            setError(error.message)
          } else {
            setError("데이터를 불러오는 중 오류가 발생했습니다.")
          }
        } finally {
          setIsLoading(false)
        }
      }

      loadTabData()
    }
  }

  const handleBookClick = (bookId: string) => {
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
      setAllBooks((prev) => [createdBook, ...prev])

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
      setAllBooks((prev) => prev.filter((book) => book.id !== bookId))

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
      setAllBooks((prev) => prev.filter((book) => book.id !== bookToDelete.id))

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
    <div className='min-h-screen bg-theme-gradient'>
      <div className='container mx-auto px-4 py-6'>
        <header className='mb-6'>
          <div className='flex items-center justify-between mb-4'>
            <h1 className='text-3xl font-bold text-theme-primary'>
              📚 독서 기록장
            </h1>
            <button
              onClick={() => router.push("/mypage")}
              className='flex items-center gap-2 text-theme-secondary hover:text-theme-primary transition-colors'
            >
              <User className='h-5 w-5' />
              <span className='text-sm'>마이페이지</span>
            </button>
          </div>
          <p className='text-theme-secondary text-sm'>
            나만의 독서 여정을 기록하고 관리해보세요
          </p>
          {user && (
            <p className='text-sm text-theme-tertiary mt-1'>
              안녕하세요, {user.displayName || "사용자"}님!
            </p>
          )}
        </header>
        {error && (
          <div className='mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg'>
            <div className='flex items-center gap-2'>
              <AlertCircle className='h-5 w-5 text-red-500' />
              <p className='text-red-700 dark:text-red-400 text-sm'>{error}</p>
            </div>
          </div>
        )}

        {/* 사용자 통계 섹션 */}
        {userStatistics && (
          <div className='mb-6 bg-theme-secondary rounded-lg p-6 shadow-sm'>
            <h2 className='text-lg font-semibold text-theme-primary mb-4'>
              📊 독서 통계
            </h2>
            <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
              <div className='text-center'>
                <div className='flex items-center justify-center mb-2'>
                  <Clock className='h-6 w-6 accent-theme-primary' />
                </div>
                <p className='text-xs text-theme-secondary mb-1'>
                  총 독서 시간
                </p>
                <p className='text-lg font-bold text-theme-primary'>
                  {Math.floor(userStatistics.totalReadingTime / 3600)}시간{" "}
                  {Math.floor((userStatistics.totalReadingTime % 3600) / 60)}분
                </p>
              </div>

              <div className='text-center'>
                <div className='flex items-center justify-center mb-2'>
                  <BookOpen className='h-6 w-6 text-green-500' />
                </div>
                <p className='text-xs text-theme-secondary mb-1'>독서 세션</p>
                <p className='text-lg font-bold text-theme-primary'>
                  {userStatistics.totalSessions}회
                </p>
              </div>

              <div className='text-center'>
                <div className='flex items-center justify-center mb-2'>
                  <TrendingUp className='h-6 w-6 text-purple-500' />
                </div>
                <p className='text-xs text-theme-secondary mb-1'>평균 세션</p>
                <p className='text-lg font-bold text-theme-primary'>
                  {Math.floor(userStatistics.averageSessionTime / 60)}분{" "}
                  {userStatistics.averageSessionTime % 60}초
                </p>
              </div>

              <div className='text-center'>
                <div className='flex items-center justify-center mb-2'>
                  <Target className='h-6 w-6 text-orange-500' />
                </div>
                <p className='text-xs text-theme-secondary mb-1'>연속 독서일</p>
                <p className='text-lg font-bold text-theme-primary'>
                  {userStatistics.readingStreak}일
                </p>
              </div>
            </div>
          </div>
        )}

        <div className='grid grid-cols-2 gap-3 mb-6'>
          <div className='bg-theme-secondary rounded-lg p-4 shadow-sm'>
            <div className='flex items-center'>
              <BookOpen className='h-6 w-6 accent-theme-primary' />
              <div className='ml-3'>
                <p className='text-xs font-medium text-theme-secondary'>
                  총 등록된 책
                </p>
                <p className='text-xl font-bold text-theme-primary'>
                  {getTotalBooks()}
                </p>
              </div>
            </div>
          </div>

          <div className='bg-theme-secondary rounded-lg p-4 shadow-sm'>
            <div className='flex items-center'>
              <Bookmark className='h-6 w-6 text-green-500' />
              <div className='ml-3'>
                <p className='text-xs font-medium text-theme-secondary'>
                  읽는 중
                </p>
                <p className='text-xl font-bold text-theme-primary'>
                  {getReadingBooks()}
                </p>
              </div>
            </div>
          </div>

          <div className='bg-theme-secondary rounded-lg p-4 shadow-sm'>
            <div className='flex items-center'>
              <CheckCircle className='h-6 w-6 text-green-600' />
              <div className='ml-3'>
                <p className='text-xs font-medium text-theme-secondary'>
                  완독한 책
                </p>
                <p className='text-xl font-bold text-theme-primary'>
                  {getCompletedBooks()}
                </p>
              </div>
            </div>
          </div>

          <div className='bg-theme-secondary rounded-lg p-4 shadow-sm'>
            <div className='flex items-center'>
              <Calendar className='h-6 w-6 text-purple-500' />
              <div className='ml-3'>
                <p className='text-xs font-medium text-theme-secondary'>
                  읽고 싶은 책
                </p>
                <p className='text-xl font-bold text-theme-primary'>
                  {getWantToReadBooks()}
                </p>
              </div>
            </div>
          </div>

          <div className='bg-theme-secondary rounded-lg p-4 shadow-sm'>
            <div className='flex items-center'>
              <Star className='h-6 w-6 text-yellow-500' />
              <div className='ml-3'>
                <p className='text-xs font-medium text-theme-secondary'>
                  평균 평점
                </p>
                <p className='text-xl font-bold text-theme-primary'>
                  {getAverageRating().toFixed(1)}
                </p>
              </div>
            </div>
          </div>
        </div>

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
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() =>
                handleTabChange(
                  tab.key as "reading" | "completed" | "want-to-read"
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

        <div className='mb-4'>
          <button
            onClick={() => setIsAddBookModalOpen(true)}
            className='flex items-center gap-2 bg-accent-theme hover:bg-accent-theme-secondary text-white px-4 py-3 rounded-lg transition-colors w-full justify-center'
          >
            <Plus className='h-5 w-5' />새 책 추가
          </button>
        </div>

        {isLoading ? (
          <div className='text-center py-12'>
            <BookOpen className='h-12 w-12 text-gray-400 mx-auto mb-4 animate-pulse' />
            <p className='text-theme-secondary'>책 목록을 불러오는 중...</p>
          </div>
        ) : books.length === 0 ? (
          <div className='text-center py-12'>
            <BookOpen className='h-12 w-12 text-gray-400 mx-auto mb-4' />
            <h3 className='text-lg font-medium text-theme-primary mb-2'>
              {getTotalBooks() === 0
                ? "아직 등록된 책이 없습니다"
                : activeTab === "reading"
                ? "읽고 있는 책이 없습니다"
                : activeTab === "completed"
                ? "완독한 책이 없습니다"
                : "읽고 싶은 책이 없습니다"}
            </h3>
            <p className='text-theme-secondary mb-4'>
              {getTotalBooks() === 0
                ? "새로운 책을 추가해보세요!"
                : activeTab === "reading"
                ? "책을 읽기 시작하면 여기에 표시됩니다"
                : activeTab === "completed"
                ? "책을 완독하면 여기에 표시됩니다"
                : "새로운 책을 추가해보세요!"}
            </p>
            {(getTotalBooks() === 0 || activeTab === "want-to-read") && (
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
          <div className='grid grid-cols-1 gap-4'>
            {books.map((book: Book) => (
              <div
                key={book.id}
                onClick={() => handleBookClick(book.id)}
                className='bg-theme-secondary rounded-lg shadow-sm hover:shadow-md transition-shadow p-4 cursor-pointer relative group'
              >
                <div className='flex items-start gap-4'>
                  <div className='w-16 h-20 bg-theme-tertiary rounded-md flex items-center justify-center flex-shrink-0'>
                    <BookOpen className='h-8 w-8 text-gray-400' />
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
                            className={`h-4 w-4 ${
                              i < book.rating
                                ? "text-yellow-400 fill-current"
                                : "text-gray-300"
                            }`}
                          />
                        ))}
                      </div>
                    </div>

                    <div className='flex items-center justify-between text-sm text-theme-tertiary'>
                      <span>{book.publishedDate || book.startDate}</span>
                      <span
                        className={`px-2 py-1 rounded-full text-xs ${
                          book.status === "reading"
                            ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                            : book.status === "completed"
                            ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                            : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200"
                        }`}
                      >
                        {book.status === "reading"
                          ? "읽는 중"
                          : book.status === "completed"
                          ? "완독"
                          : "읽고 싶음"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 삭제 버튼 */}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDeleteBook(book.id)
                  }}
                  className='absolute top-2 right-2 p-1 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors opacity-0 group-hover:opacity-100'
                  title='책 삭제'
                >
                  <Trash2 className='h-4 w-4' />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* 페이지네이션 */}
        {!isLoading && (
          <div className='mt-8 mb-8 pb-8'>
            {books.length > 0 ? (
              <Pagination
                currentPage={currentPage}
                totalPages={Math.ceil(totalItems / itemsPerPage)}
                onPageChange={handlePageChange}
                totalItems={totalItems}
                itemsPerPage={itemsPerPage}
              />
            ) : (
              <div className='h-16' />
            )}
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
    </div>
  )
}
