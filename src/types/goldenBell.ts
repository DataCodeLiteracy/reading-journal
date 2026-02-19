export interface GoldenBellRequest {
  id: string
  user_id: string
  user_display_name?: string
  book_id: string
  book_title: string
  /** 관리자 처리 상태 */
  status?: "pending" | "done"
  created_at?: Date
  updated_at?: Date
}

export type GoldenBellRequestCreate = Omit<
  GoldenBellRequest,
  "id" | "created_at" | "updated_at"
>
