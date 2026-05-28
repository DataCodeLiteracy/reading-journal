"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Download, User } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { BookService } from "@/services/bookService"
import { ReadingSessionService } from "@/services/readingSessionService"
import { UserService } from "@/services/userService"
import { buildBooksNotionCsv } from "@/utils/bookNotionCsvExport"
import {
  ADMIN_ALL_USERS_VALUE,
  formatAdminUserSelectLabel,
  getReaderDisplayName,
  type AdminUserListItem,
} from "@/utils/adminUserLabel"
import {
  buildExportRows,
  buildMultiUserNotionCsv,
  countBooksByUserId,
  groupSessionsByBookId,
} from "@/utils/adminBookExport"
import { GenericRouteSkeleton } from "@/components/skeletons"
import Select, { type SelectOption } from "@/components/Select"

function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export default function AdminBookExportPage() {
  const router = useRouter()
  const { loading, isLoggedIn, userData } = useAuth()
  const [users, setUsers] = useState<AdminUserListItem[]>([])
  const [selectedUid, setSelectedUid] = useState(ADMIN_ALL_USERS_VALUE)
  const [isExporting, setIsExporting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const userSelectOptions = useMemo((): SelectOption<string>[] => {
    const opts: SelectOption<string>[] = [
      { value: ADMIN_ALL_USERS_VALUE, label: "전체 유저" },
    ]
    const withBooks = users.filter((u) => (u.bookCount ?? 0) > 0)
    for (const u of withBooks) {
      opts.push({
        value: u.uid,
        label: formatAdminUserSelectLabel(u),
      })
    }
    return opts
  }, [users])

  useEffect(() => {
    if (!userData?.isAdmin) return
    Promise.all([
      UserService.getAllUsersForAdmin(),
      BookService.getAllBooks(5000),
    ])
      .then(([userList, books]) => {
        const bookCounts = countBooksByUserId(books)
        setUsers(
          userList.map((u) => ({
            ...u,
            bookCount: bookCounts.get(u.uid) ?? 0,
          }))
        )
      })
      .catch((err) => {
        console.error("Failed to load users:", err)
        setMessage("유저·서재 목록을 불러오지 못했습니다.")
      })
  }, [userData?.isAdmin])

  const handleExport = async () => {
    const uid = selectedUid.trim()
    if (!uid) {
      setMessage("유저를 선택한 뒤 보내기를 실행하세요.")
      return
    }

    setIsExporting(true)
    setMessage(null)

    try {
      const usersByUid = new Map(users.map((u) => [u.uid, u]))
      const stamp = new Date().toISOString().slice(0, 10)

      if (uid === ADMIN_ALL_USERS_VALUE) {
        const [books, sessions] = await Promise.all([
          BookService.getAllBooks(5000),
          ReadingSessionService.getAllReadingSessionsForAdmin(10000),
        ])
        const csv = buildMultiUserNotionCsv(books, sessions, usersByUid)
        downloadCsv(`독서노트_전체유저_${stamp}.csv`, csv)
        setMessage(`${books.length}권(전체 유저)을 CSV로 보냈습니다.`)
        return
      }

      const [books, sessions, userRecord] = await Promise.all([
        BookService.getUserBooks(uid),
        ReadingSessionService.getUserReadingSessions(uid),
        UserService.getUser(uid),
      ])

      const mergedUser: AdminUserListItem = {
        uid,
        displayName:
          userRecord?.displayName ?? usersByUid.get(uid)?.displayName ?? null,
        email: userRecord?.email ?? usersByUid.get(uid)?.email ?? null,
        bookCount: books.length,
      }
      const readerName = getReaderDisplayName(mergedUser, uid)
      const sessionsByBook = groupSessionsByBookId(sessions)
      const csv = buildBooksNotionCsv(
        buildExportRows(books, sessionsByBook, readerName)
      )

      const safeName = readerName.replace(/[^\w가-힣.-]+/g, "_")
      downloadCsv(`독서노트_${safeName}_${stamp}.csv`, csv)
      setMessage(`${books.length}권을 CSV로 보냈습니다.`)
    } catch (err) {
      console.error(err)
      setMessage(
        `보내기 실패: ${err instanceof Error ? err.message : String(err)}`
      )
    } finally {
      setIsExporting(false)
    }
  }

  if (loading || !isLoggedIn) {
    return <GenericRouteSkeleton rows={4} />
  }
  if (!userData?.isAdmin) {
    router.push("/mypage")
    return null
  }

  const usersWithBooks = users.filter((u) => (u.bookCount ?? 0) > 0).length

  return (
    <div className="min-h-screen bg-theme-gradient">
      <div className="container mx-auto px-4 py-6">
        <header className="mb-6">
          <button
            onClick={() => router.push("/admin")}
            className="mb-4 flex items-center gap-2 text-theme-secondary transition-colors hover:text-theme-primary"
          >
            <ArrowLeft className="h-5 w-5" />
            관리자 페이지로 돌아가기
          </button>
          <h1 className="mb-2 text-3xl font-bold text-theme-primary">
            노션용 CSV보내기
          </h1>
          <p className="text-sm text-theme-secondary">
            기본값은 전체 유저입니다. 한 명만내려면 목록에서 선택하세요.
            읽은 사람은 표시 이름(없으면 이메일)으로 채워집니다.
          </p>
        </header>

        <div className="mb-4 rounded-lg bg-theme-secondary p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <User className="h-5 w-5 text-theme-tertiary" />
            <label className="font-medium text-theme-primary">유저 선택</label>
          </div>
          <div className="max-w-md">
            <Select
              value={selectedUid}
              onChange={setSelectedUid}
              options={userSelectOptions}
              variant="toolbar"
              aria-label="유저 선택"
            />
          </div>
          {users.length > 0 && (
            <p className="mt-2 text-xs text-theme-tertiary">
              서재가 있는 유저 {usersWithBooks}명 · 전체 유저 선택 시 한 파일에
              모두 포함됩니다.
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={() => void handleExport()}
          disabled={isExporting || !selectedUid.trim()}
          className="inline-flex items-center gap-2 rounded-lg bg-accent-theme px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-theme-secondary disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Download className="h-4 w-4" />
          {isExporting ? "보내는 중..." : "CSV 다운로드"}
        </button>

        {message && (
          <p className="mt-4 text-sm text-theme-secondary">{message}</p>
        )}
      </div>
    </div>
  )
}
