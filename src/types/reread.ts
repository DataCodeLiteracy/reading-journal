export interface Reread {
  id: string
  bookId: string
  user_id: string
  rereadNumber: number // 몇 번째 회독인지 (1, 2, 3, ...)
  startDate: string // YYYY-MM-DD 형식
  completedDate: string // YYYY-MM-DD 형식
  durationDays?: number // 소요 일수 (계산된 값)
  created_at?: Date
  updated_at?: Date
}

