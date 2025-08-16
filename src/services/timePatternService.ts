import { ReadingSession } from "@/types/user"

export interface TimeSlot {
  hour: number
  label: string
  count: number
  totalTime: number
  percentage: number
}

export interface DayTimePattern {
  dayOfWeek: number
  dayName: string
  timeSlots: TimeSlot[]
  totalSessions: number
  totalTime: number
}

export interface TimePatternAnalysis {
  overallTimeSlots: TimeSlot[]
  dayTimePatterns: DayTimePattern[]
  mostActiveTimeSlot: TimeSlot
  mostActiveDay: DayTimePattern
  averageSessionTimeByHour: { [hour: number]: number }
}

export class TimePatternService {
  static readonly TIME_SLOTS = [
    { hour: 6, label: "새벽 (6-8시)" },
    { hour: 8, label: "아침 (8-10시)" },
    { hour: 10, label: "오전 (10-12시)" },
    { hour: 12, label: "점심 (12-14시)" },
    { hour: 14, label: "오후 (14-16시)" },
    { hour: 16, label: "저녁 (16-18시)" },
    { hour: 18, label: "밤 (18-20시)" },
    { hour: 20, label: "늦은 밤 (20-22시)" },
    { hour: 22, label: "심야 (22-24시)" },
    { hour: 0, label: "새벽 (0-2시)" },
    { hour: 2, label: "새벽 (2-4시)" },
    { hour: 4, label: "새벽 (4-6시)" },
  ]

  static analyzeTimePatterns(sessions: ReadingSession[]): TimePatternAnalysis {
    if (sessions.length === 0) {
      return this.getEmptyAnalysis()
    }

    // 모든 세션 데이터 사용 (ISO 형식과 기존 형식 모두 처리 가능)
    const validSessions = sessions

    // 전체 시간대별 통계 (유효한 세션만)
    const overallTimeSlots = this.analyzeOverallTimeSlots(validSessions)

    // 요일별 시간대 통계 (유효한 세션만)
    const dayTimePatterns = this.analyzeDayTimePatterns(validSessions)

    // 가장 활발한 시간대
    const mostActiveTimeSlot = overallTimeSlots.reduce((max, current) =>
      current.count > max.count ? current : max
    )

    // 가장 활발한 요일
    const mostActiveDay = dayTimePatterns.reduce((max, current) =>
      current.totalSessions > max.totalSessions ? current : max
    )

    // 시간대별 평균 세션 시간 (유효한 세션만)
    const averageSessionTimeByHour = this.calculateAverageSessionTimeByHour(validSessions)

    return {
      overallTimeSlots,
      dayTimePatterns,
      mostActiveTimeSlot,
      mostActiveDay,
      averageSessionTimeByHour
    }
  }

  private static analyzeOverallTimeSlots(sessions: ReadingSession[]): TimeSlot[] {
    const timeSlotMap = new Map<number, { count: number; totalTime: number }>()

    // 모든 시간대 초기화
    this.TIME_SLOTS.forEach(slot => {
      timeSlotMap.set(slot.hour, { count: 0, totalTime: 0 })
    })

    let validSessionCount = 0
    let totalReadingTime = 0

    sessions.forEach(session => {
      const startHour = this.getHourFromTimeString(session.startTime)

      // 무효한 시간(-1)인 경우 제외
      if (startHour === -1) {
        return
      }

      const timeSlot = this.getTimeSlotForHour(startHour)

      if (timeSlotMap.has(timeSlot)) {
        const current = timeSlotMap.get(timeSlot)!
        current.count += 1
        current.totalTime += session.duration
        validSessionCount++
        totalReadingTime += session.duration
      }
    })

    return this.TIME_SLOTS.map(slot => {
      const data = timeSlotMap.get(slot.hour) || { count: 0, totalTime: 0 }
      return {
        hour: slot.hour,
        label: slot.label,
        count: data.count,
        totalTime: data.totalTime,
        percentage: totalReadingTime > 0 ? (data.totalTime / totalReadingTime) * 100 : 0
      }
    })
  }

  private static analyzeDayTimePatterns(sessions: ReadingSession[]): DayTimePattern[] {
    const dayMap = new Map<number, Map<number, { count: number; totalTime: number }>>()

    // 초기화
    for (let day = 0; day < 7; day++) {
      dayMap.set(day, new Map())
      this.TIME_SLOTS.forEach(slot => {
        dayMap.get(day)!.set(slot.hour, { count: 0, totalTime: 0 })
      })
    }

    // 세션별 요일과 시간대 분석 (모든 형식 처리)
    sessions.forEach(session => {
      const koreaHour = this.getHourFromTimeString(session.startTime)

      // 무효한 시간(-1)인 경우 제외
      if (koreaHour === -1) {
        return
      }

      let dayOfWeek: number

      if (session.startTime.includes('T')) {
        // ISO 형식인 경우
        const startDate = new Date(session.startTime)

        // UTC 시간을 기준으로 한국 시간 요일 계산
        const utcHours = startDate.getUTCHours()
        const koreaHours = (utcHours + 9) % 24

        // 날짜 경계를 넘어가는 경우 처리
        let koreaDate: Date
        if (utcHours + 9 >= 24) {
          // 다음 날로 넘어감
          koreaDate = new Date(startDate.getTime() + (24 * 60 * 60 * 1000))
        } else {
          // 같은 날
          koreaDate = new Date(startDate.getTime())
        }

        dayOfWeek = koreaDate.getUTCDay()
      } else {
        // 기존 형식인 경우 date 필드 사용
        const sessionDate = new Date(session.date)
        dayOfWeek = sessionDate.getDay()
      }

      const timeSlot = this.getTimeSlotForHour(koreaHour)

      const dayData = dayMap.get(dayOfWeek)!
      const timeData = dayData.get(timeSlot)!
      timeData.count += 1
      timeData.totalTime += session.duration
    })

    const dayNames = ["일요일", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일"]

    const result = Array.from(dayMap.entries()).map(([dayOfWeek, timeData]) => {
      const timeSlots = this.TIME_SLOTS.map(slot => {
        const data = timeData.get(slot.hour) || { count: 0, totalTime: 0 }
        const totalSessions = Array.from(timeData.values()).reduce((sum, d) => sum + d.count, 0)
        return {
          hour: slot.hour,
          label: slot.label,
          count: data.count,
          totalTime: data.totalTime,
          percentage: totalSessions > 0 ? (data.count / totalSessions) * 100 : 0
        }
      })

      const totalSessions = Array.from(timeData.values()).reduce((sum, d) => sum + d.count, 0)
      const totalTime = Array.from(timeData.values()).reduce((sum, d) => sum + d.totalTime, 0)

      return {
        dayOfWeek,
        dayName: dayNames[dayOfWeek],
        timeSlots,
        totalSessions,
        totalTime
      }
    })

    return result
  }

  private static calculateAverageSessionTimeByHour(sessions: ReadingSession[]): { [hour: number]: number } {
    const hourMap = new Map<number, { totalTime: number; count: number }>()

    sessions.forEach(session => {
      const startHour = this.getHourFromTimeString(session.startTime)

      // 무효한 시간(-1)인 경우 제외
      if (startHour === -1) {
        return
      }

      const timeSlot = this.getTimeSlotForHour(startHour)

      if (hourMap.has(timeSlot)) {
        const current = hourMap.get(timeSlot)!
        current.totalTime += session.duration
        current.count += 1
      } else {
        hourMap.set(timeSlot, { totalTime: session.duration, count: 1 })
      }
    })

    const result: { [hour: number]: number } = {}
    hourMap.forEach((data, hour) => {
      result[hour] = data.totalTime / data.count
    })

    return result
  }

  private static getHourFromTimeString(timeString: string): number {
    // ISO 문자열 형식인 경우 (새로운 데이터)
    if (timeString.includes('T')) {
      const date = new Date(timeString)

      // 유효한 날짜인지 확인
      if (isNaN(date.getTime())) {
        return -1
      }

      // UTC 시간을 한국 시간대 (UTC+9)로 변환
      const koreaHour = (date.getUTCHours() + 9) % 24
      return koreaHour
    }

    // 기존 형식 데이터 처리 ("오후 10:00:14" 같은 형식)
    if (timeString.includes('오전') || timeString.includes('오후')) {
      // 더 유연한 정규식 패턴 (공백과 콜론 패턴 다양성 허용)
      const match = timeString.match(/(오전|오후)\s*(\d{1,2})\s*:\s*(\d{2})\s*:\s*(\d{2})/)
      if (match) {
        const [, period, hourStr, minuteStr, secondStr] = match
        let hour = parseInt(hourStr)

        // 오후 12시 이후는 12를 더함
        if (period === '오후' && hour !== 12) {
          hour += 12
        }
        // 오전 12시는 0시로 변환
        if (period === '오전' && hour === 12) {
          hour = 0
        }

        return hour
      } else {
        return -1
      }
    }

    // 기존 형식이지만 파싱할 수 없는 경우
    return -1
  }

  private static getTimeSlotForHour(hour: number): number {
    let result: number
    if (hour >= 0 && hour < 2) result = 0
    else if (hour >= 2 && hour < 4) result = 2
    else if (hour >= 4 && hour < 6) result = 4
    else if (hour >= 6 && hour < 8) result = 6
    else if (hour >= 8 && hour < 10) result = 8
    else if (hour >= 10 && hour < 12) result = 10
    else if (hour >= 12 && hour < 14) result = 12
    else if (hour >= 14 && hour < 16) result = 14
    else if (hour >= 16 && hour < 18) result = 16
    else if (hour >= 18 && hour < 20) result = 18
    else if (hour >= 20 && hour < 22) result = 20
    else if (hour >= 22) result = 22
    else result = 0

    return result
  }

  private static getEmptyAnalysis(): TimePatternAnalysis {
    return {
      overallTimeSlots: this.TIME_SLOTS.map(slot => ({
        hour: slot.hour,
        label: slot.label,
        count: 0,
        totalTime: 0,
        percentage: 0
      })),
      dayTimePatterns: [],
      mostActiveTimeSlot: {
        hour: 0,
        label: "",
        count: 0,
        totalTime: 0,
        percentage: 0
      },
      mostActiveDay: {
        dayOfWeek: 0,
        dayName: "",
        timeSlots: [],
        totalSessions: 0,
        totalTime: 0
      },
      averageSessionTimeByHour: {}
    }
  }
}
