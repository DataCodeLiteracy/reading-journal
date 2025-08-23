export interface ReadingRecord {
  id?: string
  day: number
  date: string
  title: string
  total_time_minutes: number
  children: ChildRecord[]
  insights: string[]
  lessons: string[]
  created_at?: Date
  updated_at?: Date
}

export interface ChildRecord {
  name: string
  age: number
  book: {
    title: string
    author: string
    publisher: string
  }
  reading_time_minutes: string // "30:10" 형식 (30분 10초)
  rating: number | null
  practice_record: {
    environment: string
    focus: string
  }
  communication_moments: CommunicationMoment[]
  unknown_words: UnknownWord[]
}

export interface CommunicationMoment {
  moment: string
  response: string
  keywords: string[]
}

export interface UnknownWord {
  word: string
  context: string
  explained: boolean
}

export interface MonthlyAnalysis {
  month: string
  totalRecords: number
  totalReadingTime: number
  totalChildren: number
  uniqueBooks: string[]
  uniqueWords: string[]
  insights: string[]
  lessons: string[]
}

export interface WordAnalysis {
  word: string
  count: number
  contexts: string[]
  explainedCount: number
  unexplainedCount: number
  firstAppearance: string
  lastAppearance: string
}
