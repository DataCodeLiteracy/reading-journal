"use client"

import { FormEvent, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { ArrowLeft, Users } from "lucide-react"
import { FormNativePickerInput } from "@/components/FormNativePickerInput"
import Select, { type SelectOption } from "@/components/Select"
import { useAuth } from "@/contexts/AuthContext"
import { queryKeys } from "@/lib/queryKeys"
import { ReadingGroupService } from "@/services/readingGroupService"
import { BOOK_LEVELS, type BookLevel } from "@/types/book"
import type { CreateReadingGroupInput } from "@/types/readingGroup"

const WEEKDAYS: SelectOption[] = [
  { value: "", label: "미정" },
  { value: "0", label: "일요일" },
  { value: "1", label: "월요일" },
  { value: "2", label: "화요일" },
  { value: "3", label: "수요일" },
  { value: "4", label: "목요일" },
  { value: "5", label: "금요일" },
  { value: "6", label: "토요일" },
]

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "모임을 만들지 못했습니다."
}

function CreateGroupSkeleton() {
  return (
    <div className="min-h-screen bg-theme-gradient pb-24">
      <div className="container mx-auto max-w-2xl animate-pulse px-4 py-6">
        <div className="mb-6 h-8 w-44 rounded bg-theme-tertiary" />
        <div className="h-[32rem] rounded-xl bg-theme-tertiary" />
      </div>
    </div>
  )
}

export default function NewReadingGroupPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { isLoggedIn, loading, user, userData, userUid } = useAuth()
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [audienceLevels, setAudienceLevels] = useState<BookLevel[]>([])
  const [defaultWeekday, setDefaultWeekday] = useState("")
  const [defaultTime, setDefaultTime] = useState("")
  const [defaultLocation, setDefaultLocation] = useState("")
  const [validationError, setValidationError] = useState("")

  useEffect(() => {
    if (!loading && !isLoggedIn) router.replace("/login")
  }, [isLoggedIn, loading, router])

  const createMutation = useMutation({
    mutationFn: (input: CreateReadingGroupInput) =>
      ReadingGroupService.createGroup(
        input,
        userUid!,
        userData?.displayName?.trim() ||
          user?.displayName?.trim() ||
          user?.email?.split("@")[0] ||
          "모임장",
      ),
    onSuccess: async (groupId) => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.readingGroups.mine(userUid),
      })
      router.replace(`/groups/${groupId}`)
    },
  })

  if (loading) return <CreateGroupSkeleton />
  if (!isLoggedIn || !userUid) return null

  const toggleLevel = (level: BookLevel) => {
    setAudienceLevels((current) =>
      current.includes(level)
        ? current.filter((item) => item !== level)
        : [...current, level],
    )
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (createMutation.isPending) return
    if (!name.trim()) {
      setValidationError("모임 이름을 입력해 주세요.")
      return
    }

    setValidationError("")
    createMutation.mutate({
      name: name.trim(),
      description: description.trim() || undefined,
      audience_levels: audienceLevels,
      default_weekday:
        defaultWeekday === "" ? undefined : Number(defaultWeekday),
      default_time: defaultTime || undefined,
      default_location: defaultLocation.trim() || undefined,
      visibility: "private",
      status: "active",
      join_mode: "invite_code",
      time_zone: "Asia/Seoul",
    })
  }

  const errorMessage =
    validationError ||
    (createMutation.isError ? getErrorMessage(createMutation.error) : "")

  return (
    <main className="min-h-screen bg-theme-gradient pb-24">
      <div className="container mx-auto max-w-2xl px-4 py-6">
        <Link
          href="/record?view=groups"
          className="mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-theme-secondary hover:text-theme-primary"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          독서모임으로
        </Link>

        <header className="mb-6">
          <div className="mb-2 flex items-center gap-3">
            <span className="rounded-xl bg-accent-theme-tertiary p-2.5">
              <Users className="h-6 w-6 text-accent-theme" aria-hidden />
            </span>
            <h1 className="text-2xl font-bold text-theme-primary">모임 만들기</h1>
          </div>
          <p className="text-sm text-theme-secondary">
            모임 정보는 만든 뒤에도 수정할 수 있습니다.
          </p>
        </header>

        <form
          onSubmit={handleSubmit}
          className="space-y-6 rounded-xl border-card bg-theme-secondary p-4 shadow-sm sm:p-6"
          aria-busy={createMutation.isPending}
        >
          <div>
            <label htmlFor="group-name" className="mb-2 block text-sm font-semibold text-theme-primary">
              모임 이름 <span className="text-red-500" aria-hidden>*</span>
            </label>
            <input
              id="group-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              maxLength={60}
              autoFocus
              className="form-control"
              placeholder="예: 토요일 어린이 고전 읽기"
            />
          </div>

          <div>
            <label htmlFor="group-description" className="mb-2 block text-sm font-semibold text-theme-primary">
              설명
            </label>
            <textarea
              id="group-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={4}
              maxLength={500}
              className="form-control form-control-textarea"
              placeholder="어떤 책을 어떻게 읽는 모임인지 소개해 주세요."
            />
          </div>

          <fieldset>
            <legend className="mb-2 text-sm font-semibold text-theme-primary">
              참여 대상
            </legend>
            <p className="mb-3 text-xs text-theme-secondary">
              여러 대상을 선택할 수 있습니다. 선택하지 않으면 전체 대상입니다.
            </p>
            <div className="flex flex-wrap gap-2">
              {BOOK_LEVELS.map((level) => {
                const selected = audienceLevels.includes(level)
                return (
                  <label
                    key={level}
                    className={`cursor-pointer rounded-full border px-3 py-1.5 text-sm transition-colors ${
                      selected
                        ? "border-accent-theme bg-accent-theme text-white"
                        : "border-theme-tertiary bg-theme-primary text-theme-secondary"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => toggleLevel(level)}
                      className="sr-only"
                    />
                    {level}
                  </label>
                )
              })}
            </div>
          </fieldset>

          <fieldset>
            <legend className="mb-3 text-sm font-semibold text-theme-primary">
              기본 모임 일정
            </legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="default-weekday" className="mb-1.5 block text-sm text-theme-secondary">
                  요일
                </label>
                <Select
                  id="default-weekday"
                  value={defaultWeekday}
                  onChangeAction={setDefaultWeekday}
                  options={WEEKDAYS}
                  emptyValue=""
                  aria-label="기본 모임 요일"
                />
              </div>
              <div>
                <label htmlFor="default-time" className="mb-1.5 block text-sm text-theme-secondary">
                  시간
                </label>
                <FormNativePickerInput
                  id="default-time"
                  picker="time"
                  value={defaultTime}
                  onChange={(event) => setDefaultTime(event.target.value)}
                />
              </div>
            </div>
            <div className="mt-4">
              <label htmlFor="default-location" className="mb-1.5 block text-sm text-theme-secondary">
                장소
              </label>
              <input
                id="default-location"
                value={defaultLocation}
                onChange={(event) => setDefaultLocation(event.target.value)}
                maxLength={100}
                className="form-control"
                placeholder="예: 온라인 또는 동네 도서관"
              />
            </div>
          </fieldset>

          <div className="rounded-lg bg-theme-tertiary p-3 text-sm text-theme-secondary">
            모임은 비공개로 생성되며, 초대코드를 받은 사람만 가입할 수 있습니다.
          </div>

          {errorMessage && (
            <p className="text-sm text-red-600" role="alert">
              {errorMessage}
            </p>
          )}

          <button
            type="submit"
            disabled={createMutation.isPending}
            className="w-full rounded-lg bg-accent-theme px-4 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {createMutation.isPending ? "모임 만드는 중..." : "모임 만들기"}
          </button>
        </form>
      </div>
    </main>
  )
}
