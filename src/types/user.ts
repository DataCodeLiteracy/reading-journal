import { AppDate } from "./firebase"

export interface User {
  uid: string
  email: string | null
  displayName: string | null
  photoURL: string | null
  emailVerified: boolean
  phoneNumber: string | null
  lastLoginAt: Date
  isActive: boolean
  isAdmin?: boolean
  created_at?: Date
  updated_at?: Date
}

export interface ReadingSession {
  id: string
  user_id: string
  bookId: string
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
