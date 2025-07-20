export interface ReadingSession {
  id: string
  startTime: string
  endTime: string
  duration: number
  date: string
}

export interface Book {
  id: string
  title: string
  author?: string
  cover: string
  rating: number
  status: "want-to-read" | "reading" | "completed"
  startDate: string
  publishedDate?: string
  completedDate?: string
  notes: string[]
  readingSessions: ReadingSession[]
  hasStartedReading: boolean
  isEdited: boolean
  originalData?: Partial<Book>
  review?: string
}
