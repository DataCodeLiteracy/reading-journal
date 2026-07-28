"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  User as UserIcon,
  Phone,
  Calendar,
  MapPin,
  FileText,
  Save,
  Check,
  Users,
  Link2,
  Copy,
} from "lucide-react"
import { updateProfile } from "firebase/auth"
import { auth } from "@/lib/firebase"
import { useAuth } from "@/contexts/AuthContext"
import Select, { type SelectOption } from "@/components/Select"
import { UserService } from "@/services/userService"
import type { UserGender } from "@/types/user"
import {
  birthYearOptions,
  formatBirthYearWithKoreanAge,
} from "@/utils/koreanAge"
import { formatKoreanMobilePhone, formatKoreanMobilePhoneInput } from "@/utils/phoneFormat"
import { SettingsPageSkeleton } from "@/components/skeletons"
import { GuardianChildService } from "@/services/guardianChildService"

const GENDER_OPTIONS: SelectOption<UserGender | "">[] = [
  { value: "", label: "선택 안 함" },
  { value: "male", label: "남성" },
  { value: "female", label: "여성" },
  { value: "other", label: "기타" },
  { value: "prefer_not_to_say", label: "밝히지 않음" },
]

function genderLabel(gender: UserGender | null | undefined): string {
  return GENDER_OPTIONS.find((o) => o.value === (gender ?? ""))?.label ?? ""
}

export default function ProfilePage() {
  const router = useRouter()
  const { loading, isLoggedIn, userUid, userData, user, refreshUserData } =
    useAuth()

  const [displayName, setDisplayName] = useState("")
  const [phoneNumber, setPhoneNumber] = useState("")
  const [birthYear, setBirthYear] = useState("")
  const [gender, setGender] = useState<UserGender | "">("")
  const [region, setRegion] = useState("")
  const [bio, setBio] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isSaved, setIsSaved] = useState(false)
  const [inviteCode, setInviteCode] = useState<string | null>(null)
  const [inviteBusy, setInviteBusy] = useState(false)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [inviteCopied, setInviteCopied] = useState(false)

  const birthYearSelectOptions = useMemo<SelectOption<string>[]>(
    () => [
      { value: "", label: "출생 연도 선택" },
      ...birthYearOptions().map((year) => ({
        value: String(year),
        label: `${year}년생`,
      })),
    ],
    [],
  )

  useEffect(() => {
    if (!loading && !isLoggedIn) {
      router.push("/login")
    }
  }, [isLoggedIn, loading, router])

  useEffect(() => {
    if (!userData) return
    setDisplayName(userData.displayName?.trim() ?? "")
    setPhoneNumber(
      userData.phoneNumber?.trim()
        ? formatKoreanMobilePhone(userData.phoneNumber)
        : "",
    )
    setBirthYear(userData.birthYear ? String(userData.birthYear) : "")
    setGender(userData.gender ?? "")
    setRegion(userData.region?.trim() ?? "")
    setBio(userData.bio?.trim() ?? "")
    setInviteCode(userData.child_invite_code?.trim() || null)
  }, [userData])

  const ensureInviteCode = async () => {
    setInviteBusy(true)
    setInviteError(null)
    try {
      const code = await GuardianChildService.ensureMyInviteCode()
      setInviteCode(code)
      await refreshUserData()
    } catch (caught) {
      setInviteError(
        caught instanceof Error
          ? caught.message
          : "연결 코드를 발급하지 못했습니다.",
      )
    } finally {
      setInviteBusy(false)
    }
  }

  const copyInviteCode = async () => {
    if (!inviteCode) return
    try {
      await navigator.clipboard.writeText(inviteCode)
      setInviteCopied(true)
      window.setTimeout(() => setInviteCopied(false), 2000)
    } catch {
      setInviteError("클립보드에 복사하지 못했습니다.")
    }
  }

  const birthYearNumber = birthYear ? Number(birthYear) : null
  const birthYearPreview =
    birthYearNumber && !Number.isNaN(birthYearNumber)
      ? formatBirthYearWithKoreanAge(birthYearNumber)
      : null

  const handleSave = async () => {
    if (!userUid) return
    setError(null)

    const trimmedName = displayName.trim()
    if (!trimmedName) {
      setError("이름을 입력해주세요.")
      return
    }

    if (bio.trim().length > 200) {
      setError("한 줄 소개는 200자 이내로 입력해주세요.")
      return
    }

    setIsSaving(true)
    setIsSaved(false)

    try {
      const profilePayload = {
        displayName: trimmedName,
        phoneNumber: phoneNumber.trim()
          ? formatKoreanMobilePhone(phoneNumber)
          : null,
        birthYear: birthYearNumber && !Number.isNaN(birthYearNumber)
          ? birthYearNumber
          : null,
        gender: gender || null,
        region: region.trim() || null,
        bio: bio.trim() || null,
      }

      await UserService.updateUserProfile(userUid, profilePayload)

      if (auth.currentUser) {
        await updateProfile(auth.currentUser, { displayName: trimmedName })
      }

      await refreshUserData()
      setIsSaved(true)
      setTimeout(() => setIsSaved(false), 2000)
    } catch (e) {
      console.error(e)
      setError("프로필 저장에 실패했습니다.")
    } finally {
      setIsSaving(false)
    }
  }

  if (loading) {
    return <SettingsPageSkeleton />
  }

  if (!isLoggedIn) {
    return null
  }

  return (
    <div className='min-h-screen bg-theme-gradient pb-20'>
      <div className='container mx-auto px-4 py-6'>
        <header className='mb-6'>
          <button
            type='button'
            onClick={() => router.push("/mypage")}
            className='mb-4 flex items-center gap-2 text-theme-secondary transition-colors hover:text-theme-primary'
          >
            <ArrowLeft className='h-5 w-5' />
            마이페이지로
          </button>
          <h1 className='mb-2 text-3xl font-bold text-theme-primary'>
            🪪 프로필 정보
          </h1>
          <p className='text-sm text-theme-secondary'>
            이름과 연락처 등 프로필 정보를 등록·수정할 수 있어요
          </p>
        </header>

        <div className='mx-auto max-w-2xl space-y-4'>
          {/* 미리보기 카드 */}
          <div className='rounded-lg border border-card bg-theme-secondary p-5 shadow-sm'>
            <div className='flex w-full items-center gap-4'>
              {user?.photoURL ? (
                <img
                  src={user.photoURL}
                  alt=''
                  className='h-16 w-16 shrink-0 rounded-full object-cover'
                />
              ) : (
                <div className='flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-theme-tertiary'>
                  <UserIcon className='h-8 w-8 text-theme-secondary' />
                </div>
              )}
              <div className='min-w-0 flex-1'>
                <p className='text-lg font-semibold text-theme-primary'>
                  {displayName.trim() || "이름 미입력"}
                </p>
                <p className='mt-0.5 truncate text-sm text-theme-secondary'>
                  {userData?.email ?? user?.email}
                </p>
              </div>
            </div>

            {birthYearPreview || gender || region.trim() || bio.trim() || phoneNumber.trim() ? (
              <div className='mt-4 w-full border-t border-theme-tertiary pt-4'>
                {(birthYearPreview || gender || region.trim() || phoneNumber.trim()) ? (
                  <div className='flex w-full flex-wrap gap-2'>
                    {birthYearPreview ? (
                      <span className='rounded-full bg-amber-100 px-2.5 py-1 text-sm font-medium text-amber-900 dark:bg-amber-900/40 dark:text-amber-100'>
                        {birthYearPreview}
                      </span>
                    ) : null}
                    {gender ? (
                      <span className='rounded-full bg-blue-100 px-2.5 py-1 text-sm font-medium text-blue-900 dark:bg-blue-900/40 dark:text-blue-100'>
                        {genderLabel(gender)}
                      </span>
                    ) : null}
                    {region.trim() ? (
                      <span className='rounded-full bg-emerald-100 px-2.5 py-1 text-sm font-medium text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100'>
                        {region.trim()}
                      </span>
                    ) : null}
                    {phoneNumber.trim() ? (
                      <span className='rounded-full bg-violet-100 px-2.5 py-1 text-sm font-medium text-violet-900 dark:bg-violet-900/40 dark:text-violet-100'>
                        {formatKoreanMobilePhone(phoneNumber)}
                      </span>
                    ) : null}
                  </div>
                ) : null}
                {bio.trim() ? (
                  <p className={`w-full text-sm leading-relaxed text-theme-primary ${birthYearPreview || gender || region.trim() || phoneNumber.trim() ? "mt-3" : ""}`}>
                    {bio.trim()}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>

          {error ? (
            <div className='rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20'>
              <p className='text-sm text-red-700 dark:text-red-400'>{error}</p>
            </div>
          ) : null}

          {/* 기본 정보 */}
          <section className='rounded-lg bg-theme-secondary p-5 shadow-sm border-card'>
            <div className='mb-4 flex items-center gap-3'>
              <div className='rounded-lg bg-blue-100 p-2 dark:bg-blue-900/20'>
                <UserIcon className='h-5 w-5 text-blue-600 dark:text-blue-400' />
              </div>
              <div>
                <h2 className='text-lg font-semibold text-theme-primary'>
                  기본 정보
                </h2>
                <p className='text-xs text-theme-secondary'>
                  앱에서 표시되는 이름입니다
                </p>
              </div>
            </div>

            <div className='space-y-4'>
              <div>
                <label
                  htmlFor='profile-display-name'
                  className='mb-1.5 block text-sm font-medium text-theme-primary'
                >
                  이름 <span className='text-red-500'>*</span>
                </label>
                <input
                  id='profile-display-name'
                  type='text'
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder='홍길동'
                  maxLength={30}
                  className='w-full rounded-lg border border-theme-tertiary bg-theme-primary px-4 py-2.5 text-theme-primary focus:outline-none focus:ring-2 focus:ring-accent-theme'
                />
              </div>

              <div>
                <label
                  htmlFor='profile-phone'
                  className='mb-1.5 block text-sm font-medium text-theme-primary'
                >
                  전화번호
                </label>
                <div className='relative'>
                  <Phone className='pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-theme-tertiary' />
                  <input
                    id='profile-phone'
                    type='tel'
                    inputMode='tel'
                    value={phoneNumber}
                    onChange={(e) =>
                      setPhoneNumber(formatKoreanMobilePhoneInput(e.target.value))
                    }
                    placeholder='010-1234-5678'
                    maxLength={13}
                    className='w-full rounded-lg border border-theme-tertiary bg-theme-primary py-2.5 pl-10 pr-4 text-theme-primary focus:outline-none focus:ring-2 focus:ring-accent-theme'
                  />
                </div>
              </div>
            </div>
          </section>

          {/* 추가 정보 */}
          <section className='rounded-lg bg-theme-secondary p-5 shadow-sm border-card'>
            <div className='mb-4 flex items-center gap-3'>
              <div className='rounded-lg bg-purple-100 p-2 dark:bg-purple-900/20'>
                <Users className='h-5 w-5 text-purple-600 dark:text-purple-400' />
              </div>
              <div>
                <h2 className='text-lg font-semibold text-theme-primary'>
                  추가 정보
                </h2>
                <p className='text-xs text-theme-secondary'>
                  선택 항목이며 언제든 수정할 수 있어요
                </p>
              </div>
            </div>

            <div className='space-y-4'>
              <div>
                <label className='mb-1.5 flex items-center gap-1.5 text-sm font-medium text-theme-primary'>
                  <Calendar className='h-4 w-4 text-theme-tertiary' />
                  출생 연도
                </label>
                <Select
                  value={birthYear}
                  onChangeAction={setBirthYear}
                  options={birthYearSelectOptions}
                  placeholder='출생 연도 선택'
                  aria-label='출생 연도'
                />
                {birthYearPreview ? (
                  <p className='mt-2 text-sm text-accent-theme'>
                    {birthYearPreview}
                  </p>
                ) : (
                  <p className='mt-2 text-xs text-theme-tertiary'>
                    출생 연도를 선택하면 한국 나이(세는 나이)로 표시됩니다
                  </p>
                )}
              </div>

              <div>
                <label className='mb-1.5 block text-sm font-medium text-theme-primary'>
                  성별
                </label>
                <Select
                  value={gender}
                  onChangeAction={(v) => setGender(v as UserGender | "")}
                  options={GENDER_OPTIONS}
                  placeholder='성별 선택'
                  aria-label='성별'
                />
              </div>

              <div>
                <label
                  htmlFor='profile-region'
                  className='mb-1.5 flex items-center gap-1.5 text-sm font-medium text-theme-primary'
                >
                  <MapPin className='h-4 w-4 text-theme-tertiary' />
                  거주 지역
                </label>
                <input
                  id='profile-region'
                  type='text'
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  placeholder='예: 서울, 경기, 부산'
                  maxLength={30}
                  className='w-full rounded-lg border border-theme-tertiary bg-theme-primary px-4 py-2.5 text-theme-primary focus:outline-none focus:ring-2 focus:ring-accent-theme'
                />
              </div>

              <div>
                <label
                  htmlFor='profile-bio'
                  className='mb-1.5 flex items-center gap-1.5 text-sm font-medium text-theme-primary'
                >
                  <FileText className='h-4 w-4 text-theme-tertiary' />
                  한 줄 소개
                </label>
                <textarea
                  id='profile-bio'
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder='독서 취향이나 자기소개를 간단히 적어보세요'
                  rows={3}
                  maxLength={200}
                  className='w-full resize-none rounded-lg border border-theme-tertiary bg-theme-primary px-4 py-2.5 text-theme-primary focus:outline-none focus:ring-2 focus:ring-accent-theme'
                />
                <p className='mt-1 text-right text-xs text-theme-tertiary'>
                  {bio.length}/200
                </p>
              </div>
            </div>
          </section>

          <button
            type='button'
            onClick={() => void handleSave()}
            disabled={isSaving}
            className='flex w-full items-center justify-center gap-2 rounded-lg bg-accent-theme px-4 py-3 font-medium text-white transition-colors hover:bg-accent-theme-secondary disabled:cursor-not-allowed disabled:opacity-50'
          >
            {isSaving ? (
              <>
                <span className='h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent' />
                저장 중...
              </>
            ) : isSaved ? (
              <>
                <Check className='h-4 w-4' />
                저장됨
              </>
            ) : (
              <>
                <Save className='h-4 w-4' />
                프로필 저장
              </>
            )}
          </button>

          <section className='rounded-lg bg-theme-secondary p-5 shadow-sm border-card'>
            <div className='mb-4 flex items-center gap-3'>
              <div className='rounded-lg bg-amber-100 p-2 dark:bg-amber-900/20'>
                <Link2 className='h-5 w-5 text-amber-700 dark:text-amber-400' />
              </div>
              <div>
                <h2 className='text-lg font-semibold text-theme-primary'>
                  보호자 연결 코드
                </h2>
                <p className='text-xs text-theme-secondary'>
                  부모·보호자가 마이페이지 「자녀 연결」에 입력하는 코드입니다.
                </p>
              </div>
            </div>
            {inviteError ? (
              <p className='mb-3 text-sm text-red-600' role='alert'>
                {inviteError}
              </p>
            ) : null}
            {inviteCode ? (
              <div className='flex items-stretch gap-2'>
                <p className='min-w-0 flex-1 rounded-lg bg-theme-tertiary px-4 py-3 font-mono text-lg tracking-widest text-theme-primary'>
                  {inviteCode}
                </p>
                <button
                  type='button'
                  onClick={() => void copyInviteCode()}
                  className='inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-theme-tertiary px-3 py-2 text-sm font-semibold text-theme-primary transition-colors hover:bg-theme-primary/10'
                  aria-label={
                    inviteCopied
                      ? "보호자 연결 코드 복사됨"
                      : `보호자 연결 코드 ${inviteCode} 복사`
                  }
                >
                  {inviteCopied ? (
                    <>
                      <Check className='h-4 w-4 text-emerald-600' aria-hidden />
                      복사됨
                    </>
                  ) : (
                    <>
                      <Copy className='h-4 w-4' aria-hidden />
                      복사
                    </>
                  )}
                </button>
              </div>
            ) : (
              <button
                type='button'
                onClick={() => void ensureInviteCode()}
                disabled={inviteBusy}
                className='rounded-lg bg-accent-theme px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50'
              >
                {inviteBusy ? "발급 중..." : "코드 발급하기"}
              </button>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
