import { AppDate } from "./firebase"

export interface Book {
  id: string
  user_id: string
  title: string
  author?: string
  publishedDate?: string
  startDate?: string
  status: "reading" | "completed" | "want-to-read"
  rating: number
  review?: string
  hasStartedReading: boolean
  completedDate?: string
  created_at?: Date
  updated_at?: Date
}
