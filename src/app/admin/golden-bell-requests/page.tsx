"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  BookOpen,
  User,
  Calendar,
  CheckCircle,
  Clock,
  Search,
  Filter,
} from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { GoldenBellRequestService } from "@/services/goldenBellRequestService"
import { UserService } from "@/services/userService"
import { GoldenBellRequest } from "@/types/goldenBell"

type UserOption = { uid: string; displayName: string | null; email: string | null }

function getDateKey(d: Date | undefined): string {
  if (!d) return "-"
  const date = typeof d === "string" ? new Date(d) : d
  return date.toISOString().slice(0, 10)
}

function formatDate(d: Date | undefined): string {
  if (!d) return "-"
  const date = typeof d === "string" ? new Date(d) : d
  return date.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function formatDateLabel(dateKey: string): string {
  if (dateKey === "-") return dateKey
  const d = new Date(dateKey + "T12:00:00")
  return d.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

export default function GoldenBellRequestsPage() {
  const router = useRouter()
  const { loading, isLoggedIn, userData } = useAuth()
  const [requests, setRequests] = useState<GoldenBellRequest[]>([])
  const [allUsers, setAllUsers] = useState<UserOption[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "done">("all")
  const [userIdFilter, setUserIdFilter] = useState("")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [bookSearch, setBookSearch] = useState("")
  const [viewMode, setViewMode] = useState<"list" | "byDate">("list")

  useEffect(() => {
    if (!loading && !isLoggedIn) {
      router.push("/login")
      return
    }
    if (!loading && isLoggedIn && userData && !userData.isAdmin) {
      router.push("/mypage")
      return
    }
    if (isLoggedIn && userData?.isAdmin) {
      loadRequests()
      UserService.getAllUsersForAdmin()
        .then(setAllUsers)
        .catch((err) => console.error("Failed to load users:", err))
    }
  }, [isLoggedIn, loading, userData])

  const loadRequests = async () => {
    try {
      setIsLoading(true)
      const data = await GoldenBellRequestService.getAll()
      setRequests(data)
    } catch (error) {
      console.error("Error loading golden bell requests:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpdateStatus = async (id: string, status: "pending" | "done") => {
    try {
      await GoldenBellRequestService.updateStatus(id, status)
      setRequests((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status } : r))
      )
    } catch (error) {
      console.error("Error updating request status:", error)
    }
  }


  const filtered = useMemo(() => {
    let list = requests
    if (statusFilter !== "all") {
      list = list.filter((r) => (r.status ?? "pending") === statusFilter)
    }
    if (userIdFilter) {
      list = list.filter((r) => r.user_id === userIdFilter)
    }
    if (dateFrom) {
      list = list.filter((r) => {
        const key = getDateKey(r.created_at)
        return key >= dateFrom
      })
    }
    if (dateTo) {
      list = list.filter((r) => {
        const key = getDateKey(r.created_at)
        return key <= dateTo
      })
    }
    if (bookSearch.trim()) {
      const q = bookSearch.trim().toLowerCase()
      list = list.filter((r) =>
        (r.book_title || "").toLowerCase().includes(q)
      )
    }
    return list
  }, [requests, statusFilter, userIdFilter, dateFrom, dateTo, bookSearch])

  const groupedByDate = useMemo(() => {
    const map = new Map<string, GoldenBellRequest[]>()
    filtered.forEach((r) => {
      const key = getDateKey(r.created_at)
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(r)
    })
    const keys = Array.from(map.keys()).sort().reverse()
    return keys.map((key) => ({ dateKey: key, items: map.get(key)! }))
  }, [filtered])

  if (!userData?.isAdmin) return null

  return (
    <div className='min-h-screen bg-theme-gradient'>
      <div className='container mx-auto px-4 py-6'>
        <header className='mb-6'>
          <button
            onClick={() => router.push("/admin")}
            className='flex items-center gap-2 text-theme-secondary hover:text-theme-primary mb-4 transition-colors'
          >
            <ArrowLeft className='h-5 w-5' />
            관리자 페이지로 돌아가기
          </button>
          <h1 className='text-3xl font-bold text-theme-primary mb-2'>
            독서 골든벨 출제 요청
          </h1>
          <p className='text-theme-secondary text-sm'>
            유저·날짜·책 이름으로 필터링하고, 출제 완료 여부를 관리할 수 있습니다.
          </p>
        </header>

        {/* 필터 영역 */}
        <div className='bg-theme-secondary rounded-lg p-4 mb-4 shadow-sm space-y-4'>
          <div className='flex items-center gap-2 text-theme-primary font-medium'>
            <Filter className='h-4 w-4' />
            필터
          </div>
          <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3'>
            <div>
              <label className='block text-xs text-theme-tertiary mb-1'>상태</label>
              <div className='flex flex-wrap gap-1.5'>
                {(["all", "pending", "done"] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setStatusFilter(f)}
                    className={`px-2.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      statusFilter === f
                        ? "bg-accent-theme text-white"
                        : "bg-theme-tertiary/50 text-theme-secondary hover:text-theme-primary"
                    }`}
                  >
                    {f === "all" ? "전체" : f === "pending" ? "대기" : "출제완료"}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className='block text-xs text-theme-tertiary mb-1'>유저</label>
              <select
                value={userIdFilter}
                onChange={(e) => setUserIdFilter(e.target.value)}
                className='w-full rounded-lg border border-theme-tertiary bg-theme-primary px-3 py-2 text-sm text-theme-primary focus:outline-none focus:ring-2 focus:ring-accent-theme'
              >
                <option value=''>전체 유저</option>
                {allUsers.map((u) => (
                  <option key={u.uid} value={u.uid}>
                    {u.displayName || u.email || u.uid}
                  </option>
                ))}
              </select>
            </div>
            <div className='relative'>
              <label className='block text-xs text-theme-tertiary mb-1'>기간 (요청일)</label>
              <div className='flex gap-2'>
                <input
                  type='date'
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className='flex-1 min-w-0 rounded-lg border border-theme-tertiary bg-theme-primary px-3 py-2 text-sm text-theme-primary focus:outline-none focus:ring-2 focus:ring-accent-theme focus:z-20'
                />
                <input
                  type='date'
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className='flex-1 min-w-0 rounded-lg border border-theme-tertiary bg-theme-primary px-3 py-2 text-sm text-theme-primary focus:outline-none focus:ring-2 focus:ring-accent-theme focus:z-20'
                />
              </div>
            </div>
            <div>
              <label className='block text-xs text-theme-tertiary mb-1'>책 이름 검색</label>
              <div className='relative'>
                <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-theme-tertiary' />
                <input
                  type='text'
                  value={bookSearch}
                  onChange={(e) => setBookSearch(e.target.value)}
                  placeholder='책 제목 입력'
                  className='w-full rounded-lg border border-theme-tertiary bg-theme-primary pl-9 pr-3 py-2 text-sm text-theme-primary placeholder:text-theme-tertiary focus:outline-none focus:ring-2 focus:ring-accent-theme'
                />
              </div>
            </div>
          </div>
          <div className='flex flex-wrap items-center gap-2 pt-2 border-t border-theme-tertiary'>
            <span className='text-xs text-theme-tertiary'>보기 방식</span>
            <button
              onClick={() => setViewMode("list")}
              className={`px-2.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                viewMode === "list"
                  ? "bg-accent-theme text-white"
                  : "bg-theme-tertiary/50 text-theme-secondary hover:text-theme-primary"
              }`}
            >
              목록
            </button>
            <button
              onClick={() => setViewMode("byDate")}
              className={`px-2.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                viewMode === "byDate"
                  ? "bg-accent-theme text-white"
                  : "bg-theme-tertiary/50 text-theme-secondary hover:text-theme-primary"
              }`}
            >
              날짜별
            </button>
            <span className='text-xs text-theme-tertiary ml-2'>
              (총 {filtered.length}건)
            </span>
          </div>
        </div>

        {isLoading ? (
          <div className='bg-theme-secondary rounded-lg p-8 text-center text-theme-secondary'>
            불러오는 중...
          </div>
        ) : filtered.length === 0 ? (
          <div className='bg-theme-secondary rounded-lg p-8 text-center text-theme-secondary'>
            조건에 맞는 요청이 없습니다.
          </div>
        ) : viewMode === "byDate" ? (
          <div className='space-y-6'>
            {groupedByDate.map(({ dateKey, items }) => (
              <div key={dateKey} className='bg-theme-secondary rounded-lg shadow-sm overflow-hidden'>
                <div className='px-4 py-2 bg-theme-tertiary/50 border-b border-theme-tertiary flex items-center gap-2'>
                  <Calendar className='h-4 w-4 text-theme-tertiary' />
                  <span className='font-medium text-theme-primary'>
                    {formatDateLabel(dateKey)}
                  </span>
                  <span className='text-sm text-theme-tertiary'>({items.length}건)</span>
                </div>
                <div className='divide-y divide-theme-tertiary'>
                  {items.map((r) => (
                    <RequestCard
                      key={r.id}
                      r={r}
                      onMarkDone={() => handleUpdateStatus(r.id, "done")}
                      onMarkPending={() => handleUpdateStatus(r.id, "pending")}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className='bg-theme-secondary rounded-lg shadow-sm overflow-hidden'>
            <div className='divide-y divide-theme-tertiary'>
              {filtered.map((r) => (
                <RequestCard
                  key={r.id}
                  r={r}
                  onMarkDone={() => handleUpdateStatus(r.id, "done")}
                  onMarkPending={() => handleUpdateStatus(r.id, "pending")}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function RequestCard({
  r,
  onMarkDone,
  onMarkPending,
}: {
  r: GoldenBellRequest
  onMarkDone: () => void
  onMarkPending: () => void
}) {
  const isDone = (r.status ?? "pending") === "done"
  return (
    <div className='p-4'>
      <div className='flex flex-col gap-3 sm:gap-4'>
        <div className='flex items-start justify-between gap-3'>
          <div className='min-w-0 flex-1'>
            <div className='flex items-center gap-2 text-theme-primary'>
              <User className='h-4 w-4 text-theme-tertiary shrink-0' />
              <span className='font-medium truncate'>
                {r.user_display_name || r.user_id}
              </span>
            </div>
            {r.user_display_name && (
              <p className='text-xs text-theme-tertiary mt-0.5 truncate'>{r.user_id}</p>
            )}
          </div>
          <div className='shrink-0'>
            {isDone ? (
              <span className='inline-flex items-center gap-1 text-green-600 dark:text-green-400 text-sm font-medium'>
                <CheckCircle className='h-4 w-4' />
                출제 완료
              </span>
            ) : (
              <span className='inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 text-sm font-medium'>
                <Clock className='h-4 w-4' />
                대기
              </span>
            )}
          </div>
        </div>

        <div className='flex items-start gap-2'>
          <BookOpen className='h-4 w-4 text-theme-tertiary shrink-0 mt-0.5' />
          <div className='min-w-0 flex-1'>
            <p className='text-theme-primary font-medium break-words'>{r.book_title}</p>
            <p className='text-xs text-theme-tertiary mt-0.5'>ID: {r.book_id}</p>
          </div>
        </div>

        <div className='flex items-center gap-2 text-sm text-theme-secondary'>
          <Calendar className='h-4 w-4 shrink-0' />
          <span>{formatDate(r.created_at)}</span>
        </div>

        <div className='flex justify-end pt-1'>
          {isDone ? (
            <button
              onClick={onMarkPending}
              className='text-sm px-3 py-1.5 rounded-lg bg-gray-500 text-white hover:bg-gray-600 transition-colors'
            >
              대기로
            </button>
          ) : (
            <button
              onClick={onMarkDone}
              className='text-sm px-3 py-1.5 rounded-lg bg-green-500 text-white hover:bg-green-600 transition-colors'
            >
              출제 완료
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
