"use client"

import { useState, useEffect } from "react"
import { BookOpen, Plus, Search, Calendar, Star, Bookmark } from "lucide-react"
import { useRouter } from "next/navigation"
import { Book } from "@/types/book"
import AddBookModal from "@/components/AddBookModal"
import { getBooksFromStorage, saveBooksToStorage } from "@/utils/storage"

export default function Home() {
  const router = useRouter()
  const [books, setBooks] = useState<Book[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const [activeTab, setActiveTab] = useState<
    "reading" | "completed" | "want-to-read"
  >("reading")

  const [isAddBookModalOpen, setIsAddBookModalOpen] = useState(false)

  // 초기 데이터 로드
  useEffect(() => {
    const loadBooks = () => {
      const storedBooks = getBooksFromStorage()

      // 저장된 데이터가 없으면 기본 데이터 사용
      if (storedBooks.length === 0) {
        const defaultBooks: Book[] = [
          {
            id: "1",
            title: "1984",
            author: "George Orwell",
            cover: "/api/placeholder/150/200",
            rating: 4,
            status: "reading",
            startDate: "2024-01-15",
            publishedDate: "1949-06-08",
            notes: [
              "매우 흥미로운 디스토피아 소설",
              "현재 사회와 비교해볼 수 있는 부분이 많음",
            ],
            readingSessions: [
              {
                id: "1",
                startTime: "14:30:00",
                endTime: "15:45:00",
                duration: 4500,
                date: "2024-01-15",
              },
            ],
            hasStartedReading: true,
            isEdited: false,
          },
          {
            id: "2",
            title: "The Great Gatsby",
            author: "F. Scott Fitzgerald",
            cover: "/api/placeholder/150/200",
            rating: 5,
            status: "completed",
            startDate: "2023-12-01",
            publishedDate: "1925-04-10",
            completedDate: "2024-01-10",
            notes: ["아메리칸 드림의 허상", "화려한 문체가 인상적"],
            readingSessions: [
              {
                id: "2",
                startTime: "09:15:00",
                endTime: "10:30:00",
                duration: 4500,
                date: "2023-12-01",
              },
            ],
            hasStartedReading: true,
            isEdited: false,
          },
        ]
        setBooks(defaultBooks)
        saveBooksToStorage(defaultBooks)
      } else {
        setBooks(storedBooks)
      }
      setIsLoading(false)
    }

    loadBooks()
  }, [])

  // 책 목록이 변경될 때마다 로컬스토리지에 저장
  useEffect(() => {
    if (!isLoading) {
      saveBooksToStorage(books)
    }
  }, [books, isLoading])

  const filteredBooks = books.filter((book: Book) => book.status === activeTab)

  const handleBookClick = (bookId: string) => {
    router.push(`/book/${bookId}/1`)
  }

  const handleAddBook = (newBook: Omit<Book, "id">) => {
    const book: Book = {
      ...newBook,
      id: Date.now().toString(),
    }
    setBooks((prev) => [...prev, book])
  }

  if (isLoading) {
    return (
      <div className='min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center'>
        <div className='text-center'>
          <BookOpen className='h-12 w-12 text-gray-400 mx-auto mb-4 animate-pulse' />
          <p className='text-gray-600 dark:text-gray-400'>로딩 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className='min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800'>
      <div className='container mx-auto px-4 py-6'>
        <header className='mb-6'>
          <h1 className='text-3xl font-bold text-gray-900 dark:text-white mb-2'>
            📚 독서 기록장
          </h1>
          <p className='text-gray-600 dark:text-gray-300 text-sm'>
            나만의 독서 여정을 기록하고 관리해보세요
          </p>
        </header>

        <div className='grid grid-cols-2 gap-3 mb-6'>
          <div className='bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm'>
            <div className='flex items-center'>
              <BookOpen className='h-6 w-6 text-blue-500' />
              <div className='ml-3'>
                <p className='text-xs font-medium text-gray-600 dark:text-gray-400'>
                  총 읽은 책
                </p>
                <p className='text-xl font-bold text-gray-900 dark:text-white'>
                  {books.filter((b: Book) => b.status === "completed").length}
                </p>
              </div>
            </div>
          </div>

          <div className='bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm'>
            <div className='flex items-center'>
              <Bookmark className='h-6 w-6 text-green-500' />
              <div className='ml-3'>
                <p className='text-xs font-medium text-gray-600 dark:text-gray-400'>
                  읽는 중
                </p>
                <p className='text-xl font-bold text-gray-900 dark:text-white'>
                  {books.filter((b: Book) => b.status === "reading").length}
                </p>
              </div>
            </div>
          </div>

          <div className='bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm'>
            <div className='flex items-center'>
              <Star className='h-6 w-6 text-yellow-500' />
              <div className='ml-3'>
                <p className='text-xs font-medium text-gray-600 dark:text-gray-400'>
                  평균 평점
                </p>
                <p className='text-xl font-bold text-gray-900 dark:text-white'>
                  {books.length > 0
                    ? (
                        books.reduce(
                          (acc: number, book: Book) => acc + book.rating,
                          0
                        ) / books.length
                      ).toFixed(1)
                    : "0.0"}
                </p>
              </div>
            </div>
          </div>

          <div className='bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm'>
            <div className='flex items-center'>
              <Calendar className='h-6 w-6 text-purple-500' />
              <div className='ml-3'>
                <p className='text-xs font-medium text-gray-600 dark:text-gray-400'>
                  읽고 싶은 책
                </p>
                <p className='text-xl font-bold text-gray-900 dark:text-white'>
                  {
                    books.filter((b: Book) => b.status === "want-to-read")
                      .length
                  }
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className='flex space-x-1 bg-white dark:bg-gray-800 rounded-lg p-1 mb-4 shadow-sm'>
          {[
            {
              key: "reading",
              label: "읽는 중",
              count: books.filter((b: Book) => b.status === "reading").length,
            },
            {
              key: "completed",
              label: "완독",
              count: books.filter((b: Book) => b.status === "completed").length,
            },
            {
              key: "want-to-read",
              label: "읽고 싶은 책",
              count: books.filter((b: Book) => b.status === "want-to-read")
                .length,
            },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() =>
                setActiveTab(
                  tab.key as "reading" | "completed" | "want-to-read"
                )
              }
              className={`flex-1 py-2 px-2 rounded-md text-xs font-medium transition-colors ${
                activeTab === tab.key
                  ? "bg-blue-500 text-white"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>

        <div className='mb-4'>
          <button
            onClick={() => setIsAddBookModalOpen(true)}
            className='flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-3 rounded-lg transition-colors w-full justify-center'
          >
            <Plus className='h-5 w-5' />새 책 추가
          </button>
        </div>

        <div className='grid grid-cols-1 gap-4'>
          {filteredBooks.map((book: Book) => (
            <div
              key={book.id}
              onClick={() => handleBookClick(book.id)}
              className='bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-shadow p-4 cursor-pointer'
            >
              <div className='flex items-start gap-4'>
                <div className='w-16 h-20 bg-gray-200 dark:bg-gray-700 rounded-md flex items-center justify-center flex-shrink-0'>
                  <BookOpen className='h-8 w-8 text-gray-400' />
                </div>
                <div className='flex-1 min-w-0'>
                  <div className='flex items-start justify-between mb-2'>
                    <div className='flex-1 min-w-0'>
                      <h3 className='font-semibold text-gray-900 dark:text-white mb-1 truncate'>
                        {book.title}
                      </h3>
                      <p className='text-sm text-gray-600 dark:text-gray-400 truncate'>
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

                  <div className='flex items-center justify-between text-sm text-gray-500 dark:text-gray-400'>
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
            </div>
          ))}
        </div>

        {filteredBooks.length === 0 && (
          <div className='text-center py-12'>
            <BookOpen className='h-12 w-12 text-gray-400 mx-auto mb-4' />
            <h3 className='text-lg font-medium text-gray-900 dark:text-white mb-2'>
              {activeTab === "reading"
                ? "읽고 있는 책이 없습니다"
                : activeTab === "completed"
                ? "완독한 책이 없습니다"
                : "읽고 싶은 책이 없습니다"}
            </h3>
            <p className='text-gray-600 dark:text-gray-400'>
              새로운 책을 추가해보세요!
            </p>
          </div>
        )}
      </div>

      <AddBookModal
        isOpen={isAddBookModalOpen}
        onClose={() => setIsAddBookModalOpen(false)}
        onAddBook={handleAddBook}
      />
    </div>
  )
}
