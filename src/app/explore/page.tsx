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
  ChevronDown,
  ChevronUp,
  Filter,
} from "lucide-react"
import {
  Book,
  BOOK_LEVELS,
  type BookLevel,
} from "@/types/book"
import { useBookCategories } from "@/hooks/useBookCategories"
import { buildCategoryFilterOptions } from "@/utils/bookCategoryFilterOptions"
import { BookService } from "@/services/bookService"
import {
  ExploreEditionRegisterError,
  registerExploreEditionBook,
} from "@/services/bookRegistrationService"
import {
  countExploreCanonicalGroups,
  fetchExploreCanonicalGroupsPage,
  type ExploreCanonicalListParams,
} from "@/services/exploreCanonicalPaginatedService"
import { fetchExploreHighlightsForGroups } from "@/services/exploreEditionHighlightsService"
import ExploreEditionGroupCard from "@/components/explore/ExploreEditionGroupCard"
import ExploreAddBookLoadingOverlay from "@/components/explore/ExploreAddBookLoadingOverlay"
import ExploreAddBookConfirmModal from "@/components/explore/ExploreAddBookConfirmModal"
import { queryKeys } from "@/lib/queryKeys"
import type { ExploreTitleGroup } from "@/types/explore"
import Pagination from "@/components/Pagination"
import Select, { type SelectOption } from "@/components/Select"
import { useAuth } from "@/contexts/AuthContext"
import { useData } from "@/contexts/DataContext"
import { ExploreListSkeleton, MinimalShellFallback } from "@/components/skeletons"
import { normalizeBookDuplicateKey } from "@/utils/bookTitleKey"
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
  { value: "recent-title", label: "최근 등록순" },
  { value: "title-asc", label: "제목 가나다순" },
  { value: "title-desc", label: "제목 가나다 역순" },
  { value: "users-desc", label: "등록 유저 많은 순" },
  { value: "users-asc", label: "등록 유저 적은 순" },
  { value: "rating-desc", label: "평점 높은 순" },
  { value: "author-asc", label: "저자 가나다순" },
] as const

export default function ExplorePage() {
  return (
    <Suspense fallback={<MinimalShellFallback />}>
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
  const [error, setError] = useState<string | null>(null)

  // URL 쿼리 파라미터에서 초기 검색어 가져오기
  const initialSearch = searchParams.get("search") || ""
  const [searchQuery, setSearchQuery] = useState(initialSearch)
  const [statusFilter, setStatusFilter] = useState<Book["status"] | "">("")
  const [authorFilter, setAuthorFilter] = useState("")
  const [userIdFilter, setUserIdFilter] = useState("")
  const [minRatingFilter, setMinRatingFilter] = useState<string>("")
  const [levelFilter, setLevelFilter] = useState<BookLevel | "">("")
  const [categoryFilter, setCategoryFilter] = useState("")
  const { data: categoryTree } = useBookCategories()
  const [onlyNotMineFilter, setOnlyNotMineFilter] = useState(false)
  const [sortBy, setSortBy] =
    useState<(typeof SORT_OPTIONS)[number]["value"]>("recent-title")
  const [currentPage, setCurrentPage] = useState(1)
  const [expandedGroupKey, setExpandedGroupKey] = useState<string | null>(null)
  const [isAddingBook, setIsAddingBook] = useState(false)
  const [addOverlayPhase, setAddOverlayPhase] = useState<"loading" | "success">(
    "loading",
  )
  const [addingBookMeta, setAddingBookMeta] = useState<{
    title: string
    publisher?: string
    groupKey: string
  } | null>(null)
  const [confirmAddOpen, setConfirmAddOpen] = useState(false)
  const [pendingAdd, setPendingAdd] = useState<{
    book: Book
    groupKey: string
  } | null>(null)
  const [filterOpen, setFilterOpen] = useState(false)

  const [exploreExamModalOpen, setExploreExamModalOpen] = useState(false)
  const [exploreExcerptModalOpen, setExploreExcerptModalOpen] = useState(false)
  const [exploreAdminTitle, setExploreAdminTitle] = useState("")
  const [exploreAdminCanonicalId, setExploreAdminCanonicalId] = useState<
    string | undefined
  >(undefined)
  const [exploreAdminPublisher, setExploreAdminPublisher] = useState<
    string | undefined
  >(undefined)

  useBodyScrollLock(isAddingBook || confirmAddOpen)

  const EXPLORE_PAGE_SIZE = 10

  const exploreListParams = useMemo(
    (): ExploreCanonicalListParams => ({
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
    queryFn: () => countExploreCanonicalGroups(exploreListParams),
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
      const skipGroupKeys = new Set<string>()
      for (let p = 1; p < currentPage; p++) {
        const prev = await fetchExploreCanonicalGroupsPage({
          ...exploreListParams,
          pageSize: EXPLORE_PAGE_SIZE,
          startAfterSnapshot: cursor,
          skipGroupKeys,
        })
        for (const key of prev.pageGroupKeys) skipGroupKeys.add(key)
        cursor = prev.lastVisible
        if (!prev.hasMore) {
          return {
            groups: [] as ExploreTitleGroup[],
            hasMore: false,
            pageGroupKeys: [] as string[],
          }
        }
      }
      return fetchExploreCanonicalGroupsPage({
        ...exploreListParams,
        pageSize: EXPLORE_PAGE_SIZE,
        startAfterSnapshot: cursor,
        skipGroupKeys,
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

  /** 서버에서 판본(제목+출판사) 카드 10개 단위로 채운 결과 */
  const grouped = useMemo(
    () => explorePageQuery.data?.groups ?? [],
    [explorePageQuery.data],
  )

  const catalogRegistrantCount = useMemo(
    () => grouped.reduce((n, g) => n + g.userCount, 0),
    [grouped],
  )

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
    () => buildCategoryFilterOptions(categoryTree),
    [categoryTree],
  )

  const exploreUserOptions = useMemo(
    (): SelectOption<string>[] => [
      { value: "", label: "전체" },
      ...uniqueUserIds.map((uid) => ({ value: uid, label: uid })),
    ],
    [uniqueUserIds],
  )

  const exploreSortOptions = useMemo(
    (): SelectOption<(typeof SORT_OPTIONS)[number]["value"]>[] =>
      SORT_OPTIONS.map((o) => ({ value: o.value, label: o.label })),
    [],
  )

  /** 검색·필터·정렬·내 책 제외는 서버에서 반영된 뒤 이 페이지 책만 묶습니다. */
  const paginated = grouped

  const highlightsGroupKeys = useMemo(
    () => paginated.map((g) => g.groupKey).join("|"),
    [paginated],
  )

  const highlightsQuery = useQuery({
    queryKey: queryKeys.explore.highlights(highlightsGroupKeys),
    queryFn: () => fetchExploreHighlightsForGroups(paginated),
    enabled: isLoggedIn && paginated.length > 0,
    staleTime: 60_000,
  })

  const myDuplicateKeySet = useMemo(
    () =>
      new Set(
        myBooksFromContext.map((b) =>
          normalizeBookDuplicateKey(b.title, b.publisher),
        ),
      ),
    [myBooksFromContext],
  )

  const openConfirmAdd = (book: Book, groupKey: string) => {
    setPendingAdd({ book, groupKey })
    setConfirmAddOpen(true)
  }

  const handleConfirmAdd = (status: Book["status"]) => {
    if (!pendingAdd) return
    const { book, groupKey } = pendingAdd
    setPendingAdd(null)
    setConfirmAddOpen(false)
    void handleAddFromExplore(book, groupKey, status)
  }

  const handleAddFromExplore = async (
    book: Book,
    groupKey: string,
    status: Book["status"] = "want-to-read",
  ) => {
    if (!userUid || isAddingBook) return
    setAddingBookMeta({
      title: book.title,
      publisher: book.publisher,
      groupKey,
    })
    setAddOverlayPhase("loading")
    try {
      setIsAddingBook(true)
      setError(null)
      const created = await registerExploreEditionBook(
        userUid,
        book,
        myBooksFromContext,
        { status },
      )
      addBook(created)
      await queryClient.invalidateQueries({ queryKey: queryKeys.explore.all })
      setAddOverlayPhase("success")
      await new Promise((resolve) => window.setTimeout(resolve, 750))
    } catch (e) {
      console.error(e)
      if (e instanceof ExploreEditionRegisterError && e.code === "duplicate") {
        setError(e.message)
      } else {
        setError("책을 추가하는 중 오류가 발생했습니다.")
      }
    } finally {
      setIsAddingBook(false)
      setAddingBookMeta(null)
      setAddOverlayPhase("loading")
    }
  }

  if (!isLoggedIn) return null

  const isExploreLoading =
    explorePageQuery.isPending && !explorePageQuery.data

  const exploreLoadError =
    explorePageQuery.error ?? exploreCountQuery.error

  const exploreLoadErrorMessage = exploreLoadError
    ? "목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요."
    : null

  return (
    <div className='min-h-screen bg-theme-gradient pb-24'>
      <div className='container mx-auto px-4 py-6'>
        <header className='mb-6'>
          <h1 className='text-2xl font-bold text-theme-primary mb-1'>
            📚 전체 책 탐색
          </h1>
          <p className='text-sm text-theme-secondary'>
            같은 제목·출판사 판본은 카드 하나로 보여 주고, 펼치면 등록한 유저를 확인할 수
            있습니다. 출판사가 다르면 별도 항목입니다.
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
                  {` · 이 페이지 판본 ${paginated.length}개 · 등록 ${catalogRegistrantCount}명`}
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
                    onChangeAction={(v) =>
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
                    onChangeAction={setAuthorFilter}
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
                    onChangeAction={setMinRatingFilter}
                    options={exploreMinRatingOptions}
                    variant='toolbar'
                    aria-label='최소 평점'
                  />
                </div>
                <div>
                  <label className='block text-xs text-theme-tertiary mb-1'>
                    문해력 수준
                  </label>
                  <Select
                    value={levelFilter}
                    onChangeAction={(v) => setLevelFilter(v as BookLevel | "")}
                    options={exploreLevelOptions}
                    variant='toolbar'
                    aria-label='문해력 수준 필터'
                  />
                </div>
                <div>
                  <label className='block text-xs text-theme-tertiary mb-1'>
                    분야
                  </label>
                  <Select
                    value={categoryFilter}
                    onChangeAction={setCategoryFilter}
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
                    onChangeAction={setUserIdFilter}
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
                    onChangeAction={(v) =>
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
                기본·검색·저자·문해력·분야·유저·정렬은 판본 문서를 10개 단위로 조회합니다.
                상태·평점 필터(또는 평점순)를 쓰면 책 문서 기준으로 조회합니다. 카드를 펼치면
                그 판본을 등록한 유저를 불러옵니다.
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
            {paginated.map((g) => {
              const iHaveThisEdition = myDuplicateKeySet.has(g.groupKey)
              const isExpanded = expandedGroupKey === g.groupKey
              return (
                <ExploreEditionGroupCard
                  key={g.groupKey}
                  group={g}
                  highlights={highlightsQuery.data?.[g.groupKey]}
                  highlightsLoading={highlightsQuery.isPending}
                  isExpanded={isExpanded}
                  onToggleExpand={() =>
                    setExpandedGroupKey((prev) =>
                      prev === g.groupKey ? null : g.groupKey,
                    )
                  }
                  iHaveThisEdition={iHaveThisEdition}
                  userUid={userUid}
                  onAddBook={(book) => openConfirmAdd(book, g.groupKey)}
                  isAddingThisEdition={
                    isAddingBook && addingBookMeta?.groupKey === g.groupKey
                  }
                  adminActions={
                    userData?.isAdmin && userUid ? (
                      <div className="mb-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setExploreAdminTitle(g.title)
                            setExploreAdminCanonicalId(
                              g.canonicalBookId ||
                                g.books.find((b) => b.canonicalBookId)
                                  ?.canonicalBookId,
                            )
                            setExploreAdminPublisher(g.publisher || undefined)
                            setExploreExamModalOpen(true)
                          }}
                          className="rounded-md bg-amber-600 px-2 py-1.5 text-xs text-white hover:bg-amber-700"
                        >
                          이해도 점검 JSON 등록
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setExploreAdminTitle(g.title)
                            setExploreAdminCanonicalId(
                              g.canonicalBookId ||
                                g.books.find((b) => b.canonicalBookId)
                                  ?.canonicalBookId,
                            )
                            setExploreAdminPublisher(g.publisher || undefined)
                            setExploreExcerptModalOpen(true)
                          }}
                          className="rounded-md bg-teal-700 px-2 py-1.5 text-xs text-white hover:bg-teal-800"
                        >
                          발췌 JSON 등록
                        </button>
                      </div>
                    ) : undefined
                  }
                />
              )
            })}
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

      <ExploreAddBookConfirmModal
        isOpen={confirmAddOpen}
        title={pendingAdd?.book.title ?? ""}
        publisher={pendingAdd?.book.publisher}
        onClose={() => {
          setConfirmAddOpen(false)
          setPendingAdd(null)
        }}
        onConfirm={handleConfirmAdd}
      />

      <ExploreAddBookLoadingOverlay
        isOpen={isAddingBook && !!addingBookMeta}
        phase={addOverlayPhase}
        bookTitle={addingBookMeta?.title ?? ""}
        publisher={addingBookMeta?.publisher}
      />

      <ReadingExamUploadModal
        isOpen={exploreExamModalOpen}
        onClose={() => {
          setExploreExamModalOpen(false)
          setExploreAdminTitle("")
          setExploreAdminCanonicalId(undefined)
          setExploreAdminPublisher(undefined)
        }}
        bookTitle={exploreAdminTitle}
        canonicalBookId={exploreAdminCanonicalId}
        publisher={exploreAdminPublisher}
        userId={userUid || ""}
        onSuccess={() => {}}
      />
      <ReadingExcerptUploadModal
        isOpen={exploreExcerptModalOpen}
        onClose={() => {
          setExploreExcerptModalOpen(false)
          setExploreAdminTitle("")
          setExploreAdminCanonicalId(undefined)
          setExploreAdminPublisher(undefined)
        }}
        bookTitle={exploreAdminTitle}
        canonicalBookId={exploreAdminCanonicalId}
        publisher={exploreAdminPublisher}
        userId={userUid || ""}
        onSuccess={() => {}}
      />
    </div>
  )
}
