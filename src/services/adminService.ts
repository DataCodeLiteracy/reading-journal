import { db } from "@/lib/firebase"
import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  where,
  Timestamp,
} from "firebase/firestore"
import { ReadingRecord, MonthlyAnalysis, WordAnalysis } from "@/types/admin"
import { parseTimeStringToMinutes, splitBookTitles } from "@/utils/timeUtils"

const COLLECTION_NAME = "reading_records"

export const adminService = {
  // JSON 데이터를 Firestore에 업로드
  async uploadReadingRecord(record: ReadingRecord): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, COLLECTION_NAME), {
        ...record,
        created_at: Timestamp.now(),
        updated_at: Timestamp.now(),
      })
      return docRef.id
    } catch (error) {
      console.error("Error uploading reading record:", error)
      throw error
    }
  },

  // 모든 독서 기록 가져오기
  async getAllReadingRecords(): Promise<ReadingRecord[]> {
    try {
      const q = query(collection(db, COLLECTION_NAME), orderBy("date", "desc"))
      const querySnapshot = await getDocs(q)
      return querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as ReadingRecord[]
    } catch (error) {
      console.error("Error getting reading records:", error)
      throw error
    }
  },

  // 특정 월의 독서 기록 가져오기
  async getMonthlyRecords(
    year: number,
    month: number
  ): Promise<ReadingRecord[]> {
    try {
      const startDate = `${year}-${month.toString().padStart(2, "0")}-01`
      const endDate = `${year}-${month.toString().padStart(2, "0")}-31`

      const q = query(
        collection(db, COLLECTION_NAME),
        where("date", ">=", startDate),
        where("date", "<=", endDate),
        orderBy("date", "desc")
      )

      const querySnapshot = await getDocs(q)
      return querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as ReadingRecord[]
    } catch (error) {
      console.error("Error getting monthly records:", error)
      throw error
    }
  },

  // 월별 분석 데이터 생성
  async getMonthlyAnalysis(
    year: number,
    month: number
  ): Promise<MonthlyAnalysis> {
    const records = await this.getMonthlyRecords(year, month)

    const totalRecords = records.length
    const allChildren = records.flatMap((record) => record.children)
    const totalReadingTime = allChildren.reduce(
      (sum, child) =>
        sum + parseTimeStringToMinutes(child.reading_time_minutes),
      0
    )
    const totalChildren = allChildren.length

    const allBookTitles = allChildren.flatMap((child) =>
      splitBookTitles(child.book.title)
    )
    const uniqueBooks = [...new Set(allBookTitles)]
    const allWords = allChildren.flatMap((child) =>
      child.unknown_words.map((word) => word.word)
    )
    const uniqueWords = [...new Set(allWords)]

    const allInsights = records.flatMap((record) => record.insights)
    const allLessons = records.flatMap((record) => record.lessons)

    return {
      month: `${year}년 ${month}월`,
      totalRecords,
      totalReadingTime,
      totalChildren,
      uniqueBooks,
      uniqueWords,
      insights: allInsights,
      lessons: allLessons,
    }
  },

  // 단어 분석 데이터 생성
  async getWordAnalysis(): Promise<WordAnalysis[]> {
    const records = await this.getAllReadingRecords()
    const wordMap = new Map<string, WordAnalysis>()

    records.forEach((record) => {
      record.children.forEach((child) => {
        child.unknown_words.forEach((wordData) => {
          const existing = wordMap.get(wordData.word)

          if (existing) {
            existing.count++
            existing.contexts.push(wordData.context)
            if (wordData.explained) {
              existing.explainedCount++
            } else {
              existing.unexplainedCount++
            }
            existing.lastAppearance = record.date
          } else {
            wordMap.set(wordData.word, {
              word: wordData.word,
              count: 1,
              contexts: [wordData.context],
              explainedCount: wordData.explained ? 1 : 0,
              unexplainedCount: wordData.explained ? 0 : 1,
              firstAppearance: record.date,
              lastAppearance: record.date,
            })
          }
        })
      })
    })

    return Array.from(wordMap.values()).sort((a, b) => b.count - a.count)
  },

  // 소통 순간 분석
  async getCommunicationAnalysis(
    year?: number,
    month?: number
  ): Promise<any[]> {
    let records: ReadingRecord[]

    if (year && month) {
      records = await this.getMonthlyRecords(year, month)
    } else {
      records = await this.getAllReadingRecords()
    }

    const allMoments = records.flatMap((record) =>
      record.children.flatMap((child) =>
        child.communication_moments.map((moment) => ({
          ...moment,
          date: record.date,
          childName: child.name,
          bookTitle: child.book.title,
        }))
      )
    )

    return allMoments.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    )
  },
}
