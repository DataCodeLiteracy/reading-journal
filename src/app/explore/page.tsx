"use client"

import { useState, useEffect, useMemo, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {
  keepPreviousData,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"
import type { DocumentData, QueryDocumentSnapshot } from "firebase/firestore"
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
import {
  Book,
  BOOK_LEVELS,
  BOOK_FIELDS,
  type BookLevel,
  type BookField,
} from "@/types/book"
import { BookService } from "@/services/bookService"
import {
  countExploreBooksForExplore,
  fetchExploreBooksForExplore,
  type ExploreBooksListParams,
} from "@/services/explorePaginatedService"
import { queryKeys } from "@/lib/queryKeys"
import { UserService } from "@/services/userService"
import type { ExploreTitleGroup } from "@/types/explore"
import Pagination from "@/components/Pagination"
import Select, { type SelectOption } from "@/components/Select"
import AddBookModal from "@/components/AddBookModal"
import ConfirmModal from "@/components/ConfirmModal"
import { useAuth } from "@/contexts/AuthContext"
import { useData } from "@/contexts/DataContext"
import { ExploreListSkeleton, GenericRouteSkeleton } from "@/components/skeletons"
import { normalizeBookTitleKey } from "@/utils/bookTitleKey"
import ReadingExamUploadModal from "@/components/ReadingExamUploadModal"
import ReadingExcerptUploadModal from "@/components/ReadingExcerptUploadModal"
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock"

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
    <Suspense
      fallback={<GenericRouteSkeleton rows={5} />}
    >
      <ExplorePageContent />
    </Suspense>
  )
}

function ExplorePageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()
  const { userUid, loading, isLoggedIn, userData } = useAuth()
  const { addBook, allBooks: myBooksFromContext } = useData()
  const [userNames, setUserNames] = useState<Record<string, string>>({})
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
  const [sortBy, setSortBy] =
    useState<(typeof SORT_OPTIONS)[number]["value"]>("title-asc")
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

  const [exploreExamModalOpen, setExploreExamModalOpen] = useState(false)
  const [exploreExcerptModalOpen, setExploreExcerptModalOpen] = useState(false)
  const [exploreAdminTitle, setExploreAdminTitle] = useState("")

  useBodyScrollLock(isAddingBook)

  const EXPLORE_PAGE_SIZE = 10

  const exploreListParams = useMemo(
    (): ExploreBooksListParams => ({
      statusFilter,
      levelFilter,
      categoryFilter,
      userIdFilter,
      authorFilter,
      minRatingFilter,
      onlyNotMineFilter,
      searchPrefix: searchQuery.trim() || undefined,
      sortBy,
      currentUserUid: userUid ?? null,
    }),
    [
      statusFilter,
      levelFilter,
      categoryFilter,
      userIdFilter,
      authorFilter,
      minRatingFilter,
      onlyNotMineFilter,
      searchQuery,
      sortBy,
      userUid,
    ],
  )

  const exploreListFiltersKey = useMemo(
    () => JSON.stringify(exploreListParams),
    [exploreListParams],
  )

  const exploreCountQuery = useQuery({
    queryKey: queryKeys.explore.booksFlatCount(exploreListFiltersKey),
    queryFn: () => countExploreBooksForExplore(exploreListParams),
    enabled: isLoggedIn,
    staleTime: 30_000,
  })

  const explorePageQuery = useQuery({
    queryKey: queryKeys.explore.booksFlatPage(
      exploreListFiltersKey,
      currentPage,
    ),
    queryFn: async () => {
      let cursor: QueryDocumentSnapshot<DocumentData> | null = null
      for (let p = 1; p < currentPage; p++) {
        const batch = await fetchExploreBooksForExplore({
          ...exploreListParams,
          pageSize: EXPLORE_PAGE_SIZE,
          startAfterSnapshot: cursor,
        })
        if (!batch.hasMore) {
          return { items: [] as Book[], hasMore: false }
        }
        cursor = batch.lastVisible
      }
      return fetchExploreBooksForExplore({
        ...exploreListParams,
        pageSize: EXPLORE_PAGE_SIZE,
        startAfterSnapshot: cursor,
      })
    },
    enabled: isLoggedIn,
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  })

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
    }
  }, [isLoggedIn, loading, router])

  useEffect(() => {
    setCurrentPage(1)
  }, [exploreListFiltersKey])

  const exploreTotalPages = Math.max(
    1,
    Math.ceil((exploreCountQuery.data ?? 0) / EXPLORE_PAGE_SIZE),
  )

  useEffect(() => {
    if (currentPage > exploreTotalPages) {
      setCurrentPage(exploreTotalPages)
    }
  }, [currentPage, exploreTotalPages])

  const catalogForGrouping = useMemo(
    () => explorePageQuery.data?.items ?? [],
    [explorePageQuery.data],
  )

  const grouped = useMemo(() => {
    const byTitle = new Map<string, Book[]>()
    for (const book of catalogForGrouping) {
      const t = (book.title || "").trim()
      if (!t) continue
      if (!byTitle.has(t)) byTitle.set(t, [])
      byTitle.get(t)!.push(book)
    }
    const list: ExploreTitleGroup[] = []
    byTitle.forEach((books, title) => {
      const author = books[0]?.author || "저자 미상"
      const userCount = new Set(books.map((b) => b.user_id)).size
      const avgRating =
        books.reduce((s, b) => s + (b.rating ?? 0), 0) / books.length
      const statuses = new Set(books.map((b) => b.status))
      list.push({ title, books, author, userCount, avgRating, statuses })
    })
    return list
  }, [catalogForGrouping])

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

  const exploreStatusOptions = useMemo(
    (): SelectOption<string>[] => [
      { value: "", label: "전체" },
      ...(Object.entries(STATUS_LABELS) as [Book["status"], string][]).map(
        ([value, label]) => ({ value, label }),
      ),
    ],
    [],
  )

  const exploreAuthorOptions = useMemo(
    (): SelectOption<string>[] => [
      { value: "", label: "전체" },
      ...uniqueAuthors.map((a) => ({ value: a, label: a })),
    ],
    [uniqueAuthors],
  )

  const exploreMinRatingOptions = useMemo(
    (): SelectOption<string>[] => [
      { value: "", label: "전체" },
      ...[1, 2, 3, 4, 5].map((n) => ({
        value: String(n),
        label: `${n}점 이상`,
      })),
    ],
    [],
  )

  const exploreLevelOptions = useMemo(
    (): SelectOption<string>[] => [
      { value: "", label: "전체" },
      ...BOOK_LEVELS.map((l) => ({ value: l, label: l })),
    ],
    [],
  )

  const exploreCategoryOptions = useMemo(
    (): SelectOption<string>[] => [
      { value: "", label: "전체" },
      ...BOOK_FIELDS.map((f) => ({ value: f, label: f })),
    ],
    [],
  )

  const exploreUserOptions = useMemo(
    (): SelectOption<string>[] => [
      { value: "", label: "전체" },
      ...uniqueUserIds.map((uid) => ({
        value: uid,
        label: userNames[uid] || uid,
      })),
    ],
    [uniqueUserIds, userNames],
  )

  const exploreSortOptions = useMemo(
    (): SelectOption<(typeof SORT_OPTIONS)[number]["value"]>[] =>
      SORT_OPTIONS.map((o) => ({ value: o.value, label: o.label })),
    [],
  )

  /** 검색·필터·정렬·내 책 제외는 서버에서 반영된 뒤 이 페이지 책만 묶습니다. */
  const paginated = grouped

  useEffect(() => {
    if (!isLoggedIn || paginated.length === 0) return
    let cancelled = false
    const run = async () => {
      const uids = [
        ...new Set(paginated.flatMap((g) => g.books.map((b) => b.user_id))),
      ].slice(0, 150)
      const names: Record<string, string> = {}
      await Promise.all(
        uids.map(async (uid) => {
          try {
            const u = await UserService.getUser(uid)
            names[uid] = u?.displayName || u?.email || uid
          } catch {
            names[uid] = uid
          }
        }),
      )
      if (!cancelled) {
        setUserNames((prev) => ({ ...prev, ...names }))
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [paginated, isLoggedIn])

  const userBookTitleKeys = useMemo(
    () => myBooksFromContext.map((b) => normalizeBookTitleKey(b.title)),
    [myBooksFromContext],
  )

  if (!isLoggedIn) return null

  const isExploreLoading =
    explorePageQuery.isPending && !explorePageQuery.data

  const exploreLoadError =
    explorePageQuery.error ?? exploreCountQuery.error

  const exploreLoadErrorMessage = exploreLoadError
    ? "목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요."
    : null

  const handleAddBookFromExplore = async (
    book: Omit<Book, "id" | "user_id">,
  ) => {
    if (!userUid) return
    const key = normalizeBookTitleKey(book.title)
    if (
      myBooksFromContext.some((b) => normalizeBookTitleKey(b.title) === key)
    ) {
      setError("이미 같은 제목으로 등록된 책이 있습니다.")
      return
    }
    try {
      setIsAddingBook(true)
      setError(null)
      const bookData = {
        ...book,
        user_id: userUid,
      }
      const created = await BookService.createBook(bookData)
      addBook(created)
      await queryClient.invalidateQueries({ queryKey: queryKeys.explore.all })
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
            같은 제목으로 등록된 책은 한 번만 표시되고, 등록한 유저를 볼 수
            있습니다.
          </p>
        </header>

        {exploreLoadError && exploreLoadErrorMessage && (
          <div className='mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg'>
            <p className='text-red-700 dark:text-red-400 text-sm'>
              {exploreLoadErrorMessage}
            </p>
          </div>
        )}

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
              placeholder='제목이 입력한 글로 시작하는 책 (서버 검색)'
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className='w-full pl-10 pr-4 py-2.5 rounded-lg border border-theme-tertiary bg-theme-primary text-theme-primary placeholder:text-theme-tertiary focus:outline-none focus:ring-2 focus:ring-accent-theme'
            />
          </div>
        </div>

        <div className='bg-theme-secondary rounded-lg mb-4 shadow-sm overflow-visible'>
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
                  {` · 이 페이지 ${catalogForGrouping.length}권 · 제목 그룹 ${paginated.length}개`}
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
                  <label className='block text-xs text-theme-tertiary mb-1'>
                    상태
                  </label>
                  <Select
                    value={statusFilter}
                    onChange={(v) =>
                      setStatusFilter((v || "") as Book["status"] | "")
                    }
                    options={exploreStatusOptions}
                    variant='toolbar'
                    aria-label='상태 필터'
                  />
                </div>
                <div>
                  <label className='block text-xs text-theme-tertiary mb-1'>
                    저자
                  </label>
                  <Select
                    value={authorFilter}
                    onChange={setAuthorFilter}
                    options={exploreAuthorOptions}
                    variant='toolbar'
                    aria-label='저자 필터'
                  />
                </div>
                <div>
                  <label className='block text-xs text-theme-tertiary mb-1'>
                    최소 평점
                  </label>
                  <Select
                    value={minRatingFilter}
                    onChange={setMinRatingFilter}
                    options={exploreMinRatingOptions}
                    variant='toolbar'
                    aria-label='최소 평점'
                  />
                </div>
                <div>
                  <label className='block text-xs text-theme-tertiary mb-1'>
                    레벨
                  </label>
                  <Select
                    value={levelFilter}
                    onChange={(v) => setLevelFilter(v as BookLevel | "")}
                    options={exploreLevelOptions}
                    variant='toolbar'
                    aria-label='레벨 필터'
                  />
                </div>
                <div>
                  <label className='block text-xs text-theme-tertiary mb-1'>
                    분야
                  </label>
                  <Select
                    value={categoryFilter}
                    onChange={(v) => setCategoryFilter(v as BookField | "")}
                    options={exploreCategoryOptions}
                    variant='toolbar'
                    aria-label='분야 필터'
                  />
                </div>
                <div className='sm:col-span-2'>
                  <label className='block text-xs text-theme-tertiary mb-1'>
                    유저별 보기 (이 유저가 등록한 책만)
                  </label>
                  <Select
                    value={userIdFilter}
                    onChange={setUserIdFilter}
                    options={exploreUserOptions}
                    variant='toolbar'
                    aria-label='등록 유저 필터'
                  />
                </div>
                <div className='sm:col-span-2'>
                  <label className='block text-xs text-theme-tertiary mb-1'>
                    정렬
                  </label>
                  <Select
                    value={sortBy}
                    onChange={(v) =>
                      setSortBy(v as (typeof SORT_OPTIONS)[number]["value"])
                    }
                    options={exploreSortOptions}
                    variant='toolbar'
                    aria-label='정렬'
                  />
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
                    <label
                      htmlFor='onlyNotMine'
                      className='text-sm text-theme-primary cursor-pointer'
                    >
                      내가 등록하지 않은 책만 보기
                    </label>
                  </div>
                )}
              </div>
              <p className='text-xs text-theme-tertiary'>
                검색·상태·저자·평점·레벨·분야·유저·정렬·내 책 제외는 모두 서버에서 적용된 뒤, 10권 단위로
                불러옵니다. 같은 제목은 한 줄로 묶어 보여 줍니다. «등록 유저 많은/적은 순»은 등록 시각
                기준으로 정렬합니다.
              </p>
            </div>
          )}
        </div>

        {isExploreLoading ? (
          <ExploreListSkeleton count={6} />
        ) : paginated.length === 0 ? (
          <div className='py-12 text-center text-theme-secondary'>
            조건에 맞는 책이 없습니다.
          </div>
        ) : (
          <div className='space-y-3'>
            {paginated.map((g) => (
              <div
                key={g.title}
                className='bg-theme-secondary rounded-lg shadow-sm border-card overflow-hidden'
              >
                <div
                  className='p-4 cursor-pointer'
                  onClick={() =>
                    setExpandedTitle((prev) =>
                      prev === g.title ? null : g.title,
                    )
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
                        <span
                          className='inline-flex items-center gap-0.5'
                          title={
                            g.userCount > 1 ? "여러 유저 평점 평균" : undefined
                          }
                        >
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
                    <div
                      className='flex items-center gap-2 shrink-0'
                      onClick={(e) => e.stopPropagation()}
                    >
                      {userUid &&
                        !g.books.some((b) => b.user_id === userUid) && (
                          <button
                            type='button'
                            onClick={() => {
                              setConfirmAddInitial({
                                title: g.title,
                                author: g.author,
                                publishedDate: g.books[0]?.publishedDate || "",
                                level: g.books[0]?.level as
                                  | BookLevel
                                  | undefined,
                                category: g.books[0]?.category as
                                  | BookField
                                  | undefined,
                              })
                              setConfirmAddOpen(true)
                            }}
                            className='inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium bg-accent-theme text-white hover:bg-accent-theme-secondary transition-colors'
                          >
                            <Plus className='h-3.5 w-3.5' />내 책으로 추가
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
                    {userData?.isAdmin && userUid && (
                      <div className='flex flex-wrap gap-2 mb-3'>
                        <button
                          type='button'
                          onClick={(e) => {
                            e.stopPropagation()
                            setExploreAdminTitle(g.title)
                            setExploreExamModalOpen(true)
                          }}
                          className='text-xs px-2 py-1.5 rounded-md bg-amber-600 text-white hover:bg-amber-700'
                        >
                          이해도 점검 JSON 등록
                        </button>
                        <button
                          type='button'
                          onClick={(e) => {
                            e.stopPropagation()
                            setExploreAdminTitle(g.title)
                            setExploreExcerptModalOpen(true)
                          }}
                          className='text-xs px-2 py-1.5 rounded-md bg-teal-700 text-white hover:bg-teal-800'
                        >
                          발췌 JSON 등록
                        </button>
                      </div>
                    )}
                    <p className='text-xs font-medium text-theme-secondary mb-2'>
                      이 책을 등록한 유저
                    </p>
                    <ul className='space-y-1.5'>
                      {g.books.map((book) => (
                        <li
                          key={book.id}
                          className='flex items-center justify-between gap-2'
                        >
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
                                  router.push(
                                    `/book/${book.id}/${book.user_id}`,
                                  )
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

        {(exploreCountQuery.data ?? 0) > 0 && (
          <Pagination
            currentPage={currentPage}
            totalPages={exploreTotalPages}
            onPageChange={setCurrentPage}
            totalItems={exploreCountQuery.data ?? 0}
            itemsPerPage={EXPLORE_PAGE_SIZE}
          />
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
        userBookTitleKeys={userBookTitleKeys}
      />
      {isAddingBook && (
        <div className='fixed inset-0 z-50 flex items-center justify-center overflow-hidden overscroll-none bg-theme-backdrop'>
          <div className='modal-dialog-surface rounded-xl px-6 py-4'>
            <p className='text-theme-primary'>책 추가 중...</p>
          </div>
        </div>
      )}

      <ReadingExamUploadModal
        isOpen={exploreExamModalOpen}
        onClose={() => {
          setExploreExamModalOpen(false)
          setExploreAdminTitle("")
        }}
        bookTitle={exploreAdminTitle}
        userId={userUid || ""}
        onSuccess={() => {}}
      />
      <ReadingExcerptUploadModal
        isOpen={exploreExcerptModalOpen}
        onClose={() => {
          setExploreExcerptModalOpen(false)
          setExploreAdminTitle("")
        }}
        bookTitle={exploreAdminTitle}
        userId={userUid || ""}
        onSuccess={() => {}}
      />
    </div>
  )
}
