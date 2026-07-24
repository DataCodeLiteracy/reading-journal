import { AppDate } from "./firebase"

export type UserGender = "male" | "female" | "other" | "prefer_not_to_say"

export interface User {
  uid: string
  email: string | null
  displayName: string | null
  photoURL: string | null
  emailVerified: boolean
  phoneNumber: string | null
  /** 출생 연도 (한국 나이 계산용) */
  birthYear?: number | null
  gender?: UserGender | null
  /** 한 줄 소개 */
  bio?: string | null
  /** 거주 지역 (예: 서울, 경기) */
  region?: string | null
  lastLoginAt: Date
  isActive: boolean
  isAdmin?: boolean
  // 레벨 시스템 관련 (리더보드 조회용)
  level?: number // 현재 레벨
  experience?: number // 총 경험치
  totalReadingTime?: number // 총 독서 시간 (초 단위)
  // 1회성 마이그레이션 플래그
  levelDataMigrated?: boolean // 레벨 데이터가 users 컬렉션에 마이그레이션되었는지 여부
  created_at?: Date
  updated_at?: Date
}

export interface ReadingSession {
  id: string
  user_id: string
  bookId: string
  source?: "timer" | "manual"
  startTime: string
  endTime: string
  duration: number
  date: string
  created_at?: Date
  updated_at?: Date
}

export interface UserStatistics {
  user_id: string
  totalReadingTime: number
  totalSessions: number
  averageSessionTime: number
  longestSessionTime: number
  averageDailyTime: number
  daysWithSessions: number
  longestStreak: number
  monthlyReadingTime: number
  mostReadGenre?: string
  readingStreak: number
  // 레벨 시스템 관련
  level?: number // 현재 레벨
  experience?: number // 총 경험치
  // 소셜 상호작용 통계 (보너스 경험치 계산용)
  totalLikesReceived?: number // 내 콘텐츠가 받은 총 좋아요 수
  totalCommentsWritten?: number // 내가 작성한 총 댓글 수
  /** 타자 필사 성공으로 쌓인 보너스 경험치 (리셋되지 않도록 별도 누적) */
  transcriptionBonusExp?: number
  // 프로필 공개 설정
  isProfilePublic?: boolean // 프로필 공개 여부 (기본값: true)
  /** 유저별 주간 독서 목표 (시간). 미설정 시 5 */
  weeklyReadingGoalHours?: number
  /** 마지막으로 주간 목표 달성 보너스를 지급한 주 (ISO 주 번호, 예: "2026-W04") */
  lastWeeklyBonusWeek?: string
  updated_at?: Date
}

export interface UserAchievement {
  id: string
  user_id: string
  name: string
  description: string
  icon: string
  unlockedAt?: AppDate
  progress: number
  maxProgress: number
}

export interface UserReadingGoal {
  id: string
  user_id: string
  year: number
  booksGoal: number
  pagesGoal: number
  timeGoal: number
  currentBooks: number
  currentPages: number
  currentTime: number
  isCompleted: boolean
  createdAt?: AppDate
  updatedAt?: AppDate
}

export interface FirebaseUser {
  uid: string
  email: string | null
  displayName?: string | null
  photoURL?: string | null
  isAdmin?: boolean
}

export interface ChecklistItem {
  id: string
  title: string
  description: string
  category: "pre-reading" | "long-term"
}

export interface UserChecklist {
  user_id: string
  preReadingCompleted: boolean
  lastPreReadingCheck?: Date
  longTermReminders: {
    [key: string]: {
      lastReminded: Date
      frequency: "daily" | "weekly" | "monthly"
    }
  }
  updated_at?: Date
}

export interface SystemChecklist {
  id: string
  type: "pre-reading" | "long-term"
  items: ChecklistItem[]
  version: string
  updated_at?: Date
}
