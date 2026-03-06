"use client"

import { useState, useEffect, useMemo, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {
  BookOpen,
  Search,
  User,
  ChevronDown,
  ChevronUp,
  Star,
  Filter,
  Users,
  Plus,
} from "lucide-react"
import { Book, BOOK_LEVELS, BOOK_FIELDS, type BookLevel, type BookField } from "@/types/book"
import { BookService } from "@/services/bookService"
import { UserService } from "@/services/userService"
import Pagination from "@/components/Pagination"
import AddBookModal from "@/components/AddBookModal"
import ConfirmModal from "@/components/ConfirmModal"
import { useAuth } from "@/contexts/AuthContext"
import { useData } from "@/contexts/DataContext"

type GroupedBook = {
  title: string
  books: Book[]
  author: string
  userCount: number
  avgRating: number
  statuses: Set<Book["status"]>
}

const STATUS_LABELS: Record<Book["status"], string> = {
  reading: "읽는 중",
  completed: "완독",
  "want-to-read": "읽고 싶은 책",
  "on-hold": "보류",
}

const SORT_OPTIONS = [
  { value: "title-asc", label: "제목 가나다순" },
  { value: "title-desc", label: "제목 가나다 역순" },
  { value: "users-desc", label: "등록 유저 많은 순" },
  { value: "users-asc", label: "등록 유저 적은 순" },
  { value: "rating-desc", label: "평점 높은 순" },
  { value: "author-asc", label: "저자 가나다순" },
] as const

export default function ExplorePage() {
  return (
    <Suspense fallback={
      <div className='min-h-screen bg-theme-gradient flex items-center justify-center'>
        <p className='text-theme-secondary'>불러오는 중...</p>
      </div>
    }>
      <ExplorePageContent />
    </Suspense>
  )
}

function ExplorePageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { userUid, loading, isLoggedIn } = useAuth()
  const { addBook } = useData()
  const [allBooks, setAllBooks] = useState<Book[]>([])
  const [userNames, setUserNames] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // URL 쿼리 파라미터에서 초기 검색어 가져오기
  const initialSearch = searchParams.get("search") || ""
  const [searchQuery, setSearchQuery] = useState(initialSearch)
  const [statusFilter, setStatusFilter] = useState<Book["status"] | "">("")
  const [authorFilter, setAuthorFilter] = useState("")
  const [userIdFilter, setUserIdFilter] = useState("")
  const [minRatingFilter, setMinRatingFilter] = useState<string>("")
  const [levelFilter, setLevelFilter] = useState<BookLevel | "">("")
  const [categoryFilter, setCategoryFilter] = useState<BookField | "">("")
  const [onlyNotMineFilter, setOnlyNotMineFilter] = useState(false)
  const [sortBy, setSortBy] = useState<typeof SORT_OPTIONS[number]["value"]>("title-asc")
  const [currentPage, setCurrentPage] = useState(1)
  const [expandedTitle, setExpandedTitle] = useState<string | null>(null)
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [addModalInitial, setAddModalInitial] = useState<{
    title: string
    author: string
    publishedDate?: string
    level?: BookLevel
    category?: BookField
  } | null>(null)
  const [confirmAddOpen, setConfirmAddOpen] = useState(false)
  const [confirmAddInitial, setConfirmAddInitial] = useState<{
    title: string
    author: string
    publishedDate?: string
    level?: BookLevel
    category?: BookField
  } | null>(null)
  const [isAddingBook, setIsAddingBook] = useState(false)
  const [filterOpen, setFilterOpen] = useState(false)

  const itemsPerPage = 15

  // URL 쿼리 파라미터 변경 시 검색어 업데이트
  useEffect(() => {
    const searchFromUrl = searchParams.get("search")
    if (searchFromUrl) {
      setSearchQuery(searchFromUrl)
    }
  }, [searchParams])

  useEffect(() => {
    if (!loading && !isLoggedIn) {
      router.push("/login")
      return
    }
    if (!isLoggedIn) return

    const load = async () => {
      try {
        setIsLoading(true)
        setError(null)
        const books = await BookService.getAllBooks()
        setAllBooks(books)

        const uids = [...new Set(books.map((b) => b.user_id))]
        const limit = 150
        const names: Record<string, string> = {}
        await Promise.all(
          uids.slice(0, limit).map(async (uid) => {
            try {
              const u = await UserService.getUser(uid)
              names[uid] = u?.displayName || u?.email || uid
            } catch {
              names[uid] = uid
            }
          })
        )
        setUserNames(names)
      } catch (e) {
        console.error(e)
        setError("책 목록을 불러오는 중 오류가 발생했습니다.")
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [isLoggedIn, loading, router])

  const grouped = useMemo(() => {
    const byTitle = new Map<string, Book[]>()
    for (const book of allBooks) {
      const t = (book.title || "").trim()
      if (!t) continue
      if (!byTitle.has(t)) byTitle.set(t, [])
      byTitle.get(t)!.push(book)
    }
    const list: GroupedBook[] = []
    byTitle.forEach((books, title) => {
      const author = books[0]?.author || "저자 미상"
      const userCount = new Set(books.map((b) => b.user_id)).size
      const avgRating =
        books.reduce((s, b) => s + (b.rating ?? 0), 0) / books.length
      const statuses = new Set(books.map((b) => b.status))
      list.push({ title, books, author, userCount, avgRating, statuses })
    })
    return list
  }, [allBooks])

  const uniqueAuthors = useMemo(() => {
    const set = new Set<string>()
    grouped.forEach((g) => {
      if (g.author && g.author !== "저자 미상") set.add(g.author)
    })
    return Array.from(set).sort()
  }, [grouped])

  const uniqueUserIds = useMemo(() => {
    const set = new Set<string>()
    grouped.forEach((g) => g.books.forEach((b) => set.add(b.user_id)))
    return Array.from(set)
  }, [grouped])

  const filtered = useMemo(() => {
    let list = grouped
    const q = searchQuery.trim().toLowerCase()
    if (q) {
      list = list.filter(
        (g) =>
          g.title.toLowerCase().includes(q) ||
          g.author.toLowerCase().includes(q)
      )
    }
    if (statusFilter) {
      list = list.filter((g) => g.statuses.has(statusFilter))
    }
    if (authorFilter) {
      list = list.filter(
        (g) => g.author.toLowerCase() === authorFilter.toLowerCase()
      )
    }
    if (userIdFilter) {
      list = list.filter((g) =>
        g.books.some((b) => b.user_id === userIdFilter)
      )
    }
    if (onlyNotMineFilter && userUid) {
      list = list.filter((g) =>
        !g.books.some((b) => b.user_id === userUid)
      )
    }
    if (levelFilter) {
      list = list.filter((g) =>
        g.books.some((b) => b.level === levelFilter)
      )
    }
    if (categoryFilter) {
      list = list.filter((g) =>
        g.books.some((b) => b.category === categoryFilter)
      )
    }
    const minR = minRatingFilter === "" ? 0 : parseFloat(minRatingFilter)
    if (!Number.isNaN(minR) && minR > 0) {
      list = list.filter((g) => g.avgRating >= minR)
    }
    const sorted = [...list]
    switch (sortBy) {
      case "title-asc":
        sorted.sort((a, b) => a.title.localeCompare(b.title))
        break
      case "title-desc":
        sorted.sort((a, b) => b.title.localeCompare(a.title))
        break
      case "users-desc":
        sorted.sort((a, b) => b.userCount - a.userCount)
        break
      case "users-asc":
        sorted.sort((a, b) => a.userCount - b.userCount)
        break
      case "rating-desc":
        sorted.sort((a, b) => b.avgRating - a.avgRating)
        break
      case "author-asc":
        sorted.sort((a, b) => a.author.localeCompare(b.author))
        break
    }
    return sorted
  }, [grouped, searchQuery, statusFilter, authorFilter, userIdFilter, onlyNotMineFilter, userUid, levelFilter, categoryFilter, minRatingFilter, sortBy])

  const totalItems = filtered.length
  const start = (currentPage - 1) * itemsPerPage
  const paginated = useMemo(
    () => filtered.slice(start, start + itemsPerPage),
    [filtered, start, itemsPerPage]
  )

  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, statusFilter, authorFilter, userIdFilter, onlyNotMineFilter, levelFilter, categoryFilter, minRatingFilter, sortBy])

  if (!isLoggedIn) return null

  const handleAddBookFromExplore = async (book: Omit<Book, "id" | "user_id">) => {
    if (!userUid) return
    try {
      setIsAddingBook(true)
      setError(null)
      const bookData = {
        ...book,
        user_id: userUid,
      }
      const id = await BookService.createBook(bookData)
      const created: Book = { ...bookData, id } as Book
      addBook(created)
      setAllBooks((prev) => [...prev, created])
      setAddModalOpen(false)
      setAddModalInitial(null)
    } catch (e) {
      console.error(e)
      setError("책을 추가하는 중 오류가 발생했습니다.")
    } finally {
      setIsAddingBook(false)
    }
  }

  return (
    <div className='min-h-screen bg-theme-gradient pb-24'>
      <div className='container mx-auto px-4 py-6'>
        <header className='mb-6'>
          <h1 className='text-2xl font-bold text-theme-primary mb-1'>
            📚 전체 책 탐색
          </h1>
          <p className='text-sm text-theme-secondary'>
            같은 제목으로 등록된 책은 한 번만 표시되고, 등록한 유저를 볼 수 있습니다.
          </p>
        </header>

        {error && (
          <div className='mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg'>
            <p className='text-red-700 dark:text-red-400 text-sm'>{error}</p>
          </div>
        )}

        <div className='mb-4'>
          <div className='relative'>
            <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-theme-tertiary' />
            <input
              type='text'
              placeholder='제목 또는 저자로 검색'
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className='w-full pl-10 pr-4 py-2.5 rounded-lg border border-theme-tertiary bg-theme-primary text-theme-primary placeholder:text-theme-tertiary focus:outline-none focus:ring-2 focus:ring-accent-theme'
            />
          </div>
        </div>

        <div className='bg-theme-secondary rounded-lg mb-4 shadow-sm overflow-hidden'>
          <button
            type='button'
            onClick={() => setFilterOpen((o) => !o)}
            className='w-full flex items-center justify-between gap-2 pl-4 pr-6 py-4 text-left text-theme-primary font-medium hover:bg-theme-tertiary/50 transition-colors'
          >
            <span className='flex items-center gap-2'>
              <Filter className='h-4 w-4' />
              필터 / 정렬
              {!filterOpen && (
                <span className='text-xs font-normal text-theme-secondary'>
                  · 총 {filtered.length}권
                </span>
              )}
            </span>
            {filterOpen ? (
              <ChevronUp className='h-5 w-5 shrink-0 text-theme-tertiary' />
            ) : (
              <ChevronDown className='h-5 w-5 shrink-0 text-theme-tertiary' />
            )}
          </button>
          {filterOpen && (
            <div className='px-4 pb-4 pt-0 space-y-3 border-t border-theme-tertiary/50'>
              <div className='grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3'>
            <div>
              <label className='block text-xs text-theme-tertiary mb-1'>상태</label>
              <select
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter((e.target.value || "") as Book["status"] | "")
                }
                className='w-full rounded-lg border border-theme-tertiary bg-theme-primary px-3 py-2 text-sm text-theme-primary'
              >
                <option value=''>전체</option>
                {(Object.entries(STATUS_LABELS) as [Book["status"], string][]).map(
                  ([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  )
                )}
              </select>
            </div>
            <div>
              <label className='block text-xs text-theme-tertiary mb-1'>저자</label>
              <select
                value={authorFilter}
                onChange={(e) => setAuthorFilter(e.target.value)}
                className='w-full rounded-lg border border-theme-tertiary bg-theme-primary px-3 py-2 text-sm text-theme-primary'
              >
                <option value=''>전체</option>
                {uniqueAuthors.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className='block text-xs text-theme-tertiary mb-1'>최소 평점</label>
              <select
                value={minRatingFilter}
                onChange={(e) => setMinRatingFilter(e.target.value)}
                className='w-full rounded-lg border border-theme-tertiary bg-theme-primary px-3 py-2 text-sm text-theme-primary'
              >
                <option value=''>전체</option>
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={String(n)}>
                    {n}점 이상
                  </option>
                ))}
              </select>
            </div>
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
            <div className='sm:col-span-2'>
              <label className='block text-xs text-theme-tertiary mb-1'>
                유저별 보기 (이 유저가 등록한 책만)
              </label>
              <select
                value={userIdFilter}
                onChange={(e) => setUserIdFilter(e.target.value)}
                className='w-full rounded-lg border border-theme-tertiary bg-theme-primary px-3 py-2 text-sm text-theme-primary'
              >
                <option value=''>전체</option>
                {uniqueUserIds.map((uid) => (
                  <option key={uid} value={uid}>
                    {userNames[uid] || uid}
                  </option>
                ))}
              </select>
            </div>
            <div className='sm:col-span-2'>
              <label className='block text-xs text-theme-tertiary mb-1'>정렬</label>
              <select
                value={sortBy}
                onChange={(e) =>
                  setSortBy(e.target.value as typeof SORT_OPTIONS[number]["value"])
                }
                className='w-full rounded-lg border border-theme-tertiary bg-theme-primary px-3 py-2 text-sm text-theme-primary'
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            {userUid && (
              <div className='sm:col-span-2 flex items-center gap-2'>
                <input
                  type='checkbox'
                  id='onlyNotMine'
                  checked={onlyNotMineFilter}
                  onChange={(e) => setOnlyNotMineFilter(e.target.checked)}
                  className='rounded border-theme-tertiary text-accent-theme focus:ring-accent-theme'
                />
                <label htmlFor='onlyNotMine' className='text-sm text-theme-primary cursor-pointer'>
                  내가 등록하지 않은 책만 보기
                </label>
              </div>
            )}
              </div>
              <p className='text-xs text-theme-tertiary'>
                총 {filtered.length}권 (제목 기준 중복 제외)
              </p>
            </div>
          )}
        </div>

        {isLoading ? (
          <div className='py-12 text-center text-theme-secondary'>
            불러오는 중...
          </div>
        ) : paginated.length === 0 ? (
          <div className='py-12 text-center text-theme-secondary'>
            조건에 맞는 책이 없습니다.
          </div>
        ) : (
          <div className='space-y-3'>
            {paginated.map((g) => (
              <div
                key={g.title}
                className='bg-theme-secondary rounded-lg shadow-sm overflow-hidden'
              >
                <div
                  className='p-4 cursor-pointer'
                  onClick={() =>
                    setExpandedTitle((prev) => (prev === g.title ? null : g.title))
                  }
                >
                  <div className='flex items-start gap-3'>
                    <div className='w-12 h-16 bg-theme-tertiary rounded-md flex items-center justify-center flex-shrink-0'>
                      <BookOpen className='h-6 w-6 text-theme-tertiary' />
                    </div>
                    <div className='flex-1 min-w-0'>
                      <h3 className='font-semibold text-theme-primary mb-0.5'>
                        {g.title}
                      </h3>
                      <p className='text-sm text-theme-secondary mb-1'>
                        {g.author}
                      </p>
                      <div className='flex flex-wrap items-center gap-2 text-xs'>
                        <span className='inline-flex items-center gap-1 text-theme-tertiary'>
                          <Users className='h-3.5 w-3' />
                          {g.userCount}명 등록
                        </span>
                        <span className='inline-flex items-center gap-0.5' title={g.userCount > 1 ? "여러 유저 평점 평균" : undefined}>
                          <Star className='h-3.5 w-3.5 text-yellow-500 fill-current' />
                          {g.avgRating.toFixed(1)}
                          {g.userCount > 1 && (
                            <span className='text-theme-tertiary'>(평균)</span>
                          )}
                        </span>
                        {[...g.statuses].map((s) => (
                          <span
                            key={s}
                            className='px-1.5 py-0.5 rounded bg-theme-tertiary text-theme-secondary'
                          >
                            {STATUS_LABELS[s]}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className='flex items-center gap-2 shrink-0' onClick={(e) => e.stopPropagation()}>
                      {userUid && !g.books.some((b) => b.user_id === userUid) && (
                        <button
                          type='button'
                          onClick={() => {
                            setConfirmAddInitial({
                              title: g.title,
                              author: g.author,
                              publishedDate: g.books[0]?.publishedDate || "",
                              level: g.books[0]?.level as BookLevel | undefined,
                              category: g.books[0]?.category as BookField | undefined,
                            })
                            setConfirmAddOpen(true)
                          }}
                          className='inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium bg-accent-theme text-white hover:bg-accent-theme-secondary transition-colors'
                        >
                          <Plus className='h-3.5 w-3.5' />
                          내 책으로 추가
                        </button>
                      )}
                      <ChevronDown
                        className={`h-5 w-5 text-theme-tertiary transition-transform ${
                          expandedTitle === g.title ? "rotate-180" : ""
                        }`}
                      />
                    </div>
                  </div>
                </div>
                {expandedTitle === g.title && (
                  <div className='border-t border-theme-tertiary bg-theme-tertiary/30 px-4 py-3'>
                    <p className='text-xs font-medium text-theme-secondary mb-2'>
                      이 책을 등록한 유저
                    </p>
                    <ul className='space-y-1.5'>
                      {g.books.map((book) => (
                        <li key={book.id} className='flex items-center justify-between gap-2'>
                          <button
                            type='button'
                            onClick={(e) => {
                              e.stopPropagation()
                              router.push(`/user/${book.user_id}`)
                            }}
                            className='inline-flex items-center gap-1.5 text-sm text-accent-theme hover:underline'
                          >
                            <User className='h-3.5 w-3.5' />
                            {userNames[book.user_id] || book.user_id}
                          </button>
                          <div className='flex items-center gap-2'>
                            <span className='text-xs text-theme-tertiary'>
                              {STATUS_LABELS[book.status]} · {book.rating}점
                            </span>
                            {userUid === book.user_id && (
                              <button
                                type='button'
                                onClick={(e) => {
                                  e.stopPropagation()
                                  router.push(`/book/${book.id}/${book.user_id}`)
                                }}
                                className='text-xs px-2 py-1 rounded bg-accent-theme text-white'
                              >
                                내 책 보기
                              </button>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {totalItems > 0 && (
          <div className='mt-6'>
            <Pagination
              currentPage={currentPage}
              totalPages={Math.ceil(totalItems / itemsPerPage)}
              onPageChange={setCurrentPage}
              totalItems={totalItems}
              itemsPerPage={itemsPerPage}
            />
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={confirmAddOpen}
        onClose={() => {
          setConfirmAddOpen(false)
          setConfirmAddInitial(null)
        }}
        onConfirm={() => {
          if (confirmAddInitial) {
            setAddModalInitial(confirmAddInitial)
            setAddModalOpen(true)
          }
          setConfirmAddOpen(false)
          setConfirmAddInitial(null)
        }}
        title='내 책으로 등록'
        message={
          confirmAddInitial
            ? `"${confirmAddInitial.title}"(을)를 내 책으로 등록하시겠습니까?`
            : ""
        }
        confirmText='등록하기'
        cancelText='취소'
        icon={Plus}
        iconColor='text-accent-theme'
        iconBgColor='bg-accent-theme/20'
        confirmButtonColor='bg-accent-theme'
        confirmButtonHoverColor='hover:bg-accent-theme-secondary'
        showSubtitle={false}
      />
      <AddBookModal
        isOpen={addModalOpen}
        onClose={() => {
          setAddModalOpen(false)
          setAddModalInitial(null)
        }}
        onAddBook={handleAddBookFromExplore}
        initialTitle={addModalInitial?.title ?? ""}
        initialAuthor={addModalInitial?.author ?? ""}
        initialPublishedDate={addModalInitial?.publishedDate ?? ""}
        initialLevel={addModalInitial?.level}
        initialCategory={addModalInitial?.category}
        skipDuplicateCheck={true}
      />
      {isAddingBook && (
        <div className='fixed inset-0 bg-black/50 flex items-center justify-center z-50'>
          <div className='bg-theme-secondary rounded-lg px-6 py-4 shadow-lg'>
            <p className='text-theme-primary'>책 추가 중...</p>
          </div>
        </div>
      )}
    </div>
  )
}
