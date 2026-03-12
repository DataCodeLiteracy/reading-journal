/**
 * 분을 시간과 분으로 변환하여 읽기 쉬운 형태로 반환
 * @param totalMinutes 총 분 수
 * @returns "1시간 35분" 형태의 문자열
 */
export const formatReadingTime = (totalMinutes: number): string => {
  if (totalMinutes < 1) {
    return "0:00"
  }

  const hours = Math.floor(totalMinutes / 60)
  const minutes = Math.floor(totalMinutes % 60)

  if (hours === 0) {
    return `${minutes}:00`
  } else {
    return `${hours}:${minutes.toString().padStart(2, "0")}:00`
  }
}

export const formatReadingTimeWithSeconds = (totalSeconds: number): string => {
  if (totalSeconds < 60) {
    return `0:${totalSeconds.toString().padStart(2, "0")}`
  }

  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  if (hours === 0) {
    return `${minutes}:${seconds.toString().padStart(2, "0")}`
  } else {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds
      .toString()
      .padStart(2, "0")}`
  }
}

// "30:10" 형식의 시간 문자열을 분으로 변환
export const parseTimeStringToMinutes = (timeString: string): number => {
  if (!timeString || typeof timeString !== "string") return 0

  const parts = timeString.split(":")
  if (parts.length === 2) {
    // "30:10" 형식 (분:초)
    const minutes = parseInt(parts[0]) || 0
    const seconds = parseInt(parts[1]) || 0
    return minutes + seconds / 60
  } else if (parts.length === 3) {
    // "1:30:10" 형식 (시:분:초)
    const hours = parseInt(parts[0]) || 0
    const minutes = parseInt(parts[1]) || 0
    const seconds = parseInt(parts[2]) || 0
    return hours * 60 + minutes + seconds / 60
  }

  return 0
}

// "30:10" 형식의 시간 문자열을 초로 변환
export const parseTimeStringToSeconds = (timeString: string): number => {
  if (!timeString || typeof timeString !== "string") return 0

  const parts = timeString.split(":")
  if (parts.length === 2) {
    // "30:10" 형식 (분:초)
    const minutes = parseInt(parts[0]) || 0
    const seconds = parseInt(parts[1]) || 0
    return minutes * 60 + seconds
  } else if (parts.length === 3) {
    // "1:30:10" 형식 (시:분:초)
    const hours = parseInt(parts[0]) || 0
    const minutes = parseInt(parts[1]) || 0
    const seconds = parseInt(parts[2]) || 0
    return hours * 3600 + minutes * 60 + seconds
  }

  return 0
}

/**
 * 초를 시간, 분, 초로 변환하여 읽기 쉬운 형태로 반환
 * @param totalSeconds 총 초 수
 * @returns "1시간 35분 30초" 형태의 문자열
 */
export const formatReadingTimeFromSeconds = (totalSeconds: number): string => {
  if (totalSeconds < 60) {
    return `${totalSeconds}초`
  }

  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  if (hours === 0) {
    if (seconds === 0) {
      return `${minutes}분`
    } else {
      return `${minutes}분 ${seconds}초`
    }
  } else if (minutes === 0 && seconds === 0) {
    return `${hours}시간`
  } else if (seconds === 0) {
    return `${hours}시간 ${minutes}분`
  } else {
    return `${hours}시간 ${minutes}분 ${seconds}초`
  }
}

// 쉼표로 구분된 책 제목을 개별 책으로 분리
export const splitBookTitles = (bookTitle: string): string[] => {
  if (!bookTitle || typeof bookTitle !== "string") return []

  return bookTitle
    .split(",")
    .map((title) => title.trim())
    .filter((title) => title.length > 0)
}

/**
 * 한국 시간(KST, UTC+9) 기준으로 날짜를 계산
 * 00:00 KST ~ 23:59 KST 를 그날로 처리 (자정~자정 기준)
 * @param date Date 객체 (로컬 시간 또는 UTC 시간)
 * @returns "YYYY-MM-DD" 형식의 날짜 문자열
 */
export const getKoreaDate = (date: Date): string => {
  const utcTimestamp = date.getTime()
  const koreaTimestamp = utcTimestamp + 9 * 60 * 60 * 1000
  const koreaTime = new Date(koreaTimestamp)

  const year = koreaTime.getUTCFullYear()
  const month = String(koreaTime.getUTCMonth() + 1).padStart(2, "0")
  const day = String(koreaTime.getUTCDate()).padStart(2, "0")

  return `${year}-${month}-${day}`
}

/**
 * 한국 시간(KST) 기준 이번 주 월요일~일요일 날짜 문자열 반환
 * 일주일 = 월요일 00:00 KST ~ 일요일 23:59 KST
 */
export function getCurrentWeekRangeKST(): { monday: string; sunday: string } {
  const now = new Date()
  const todayKST = getKoreaDate(now)
  const [y, m, d] = todayKST.split("-").map(Number)
  // 해당 날짜 00:00 KST = UTC (y,m,d-1) 15:00
  const kstMidnight = new Date(Date.UTC(y, m - 1, d - 1, 15, 0, 0, 0))
  const dayOfWeek = kstMidnight.getUTCDay() // 0=Sun, 1=Mon, ...
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  const mondayUTC = new Date(kstMidnight.getTime() - daysFromMonday * 86400000)
  const sundayUTC = new Date(mondayUTC.getTime() + 6 * 86400000)
  const monday = getKoreaDate(mondayUTC)
  const sunday = getKoreaDate(sundayUTC)
  return { monday, sunday }
}

/**
 * 한국 시간(KST) 기준 해당 날짜가 속한 주의 ISO 주 문자열 반환 (예: "2026-W04")
 * 월~일 한 주 단위, 목요일 기준 연도·주차 계산
 */
export function getISOWeekStringKST(date: Date): string {
  const todayKST = getKoreaDate(date)
  const [y, m, d] = todayKST.split("-").map(Number)
  const kstMidnight = new Date(Date.UTC(y, m - 1, d - 1, 15, 0, 0, 0))
  const dayOfWeek = kstMidnight.getUTCDay()
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  const mondayUTC = new Date(kstMidnight.getTime() - daysFromMonday * 86400000)
  const thursdayUTC = new Date(mondayUTC.getTime() + 3 * 86400000)
  const year = thursdayUTC.getUTCFullYear()
  const week1Thursday = new Date(Date.UTC(year, 0, 1))
  const weekNo = 1 + Math.floor((thursdayUTC.getTime() - week1Thursday.getTime()) / 604800000)
  return `${year}-W${String(weekNo).padStart(2, "0")}`
}

const WEEKDAY_KO = ["일", "월", "화", "수", "목", "금", "토"]

/**
 * 한국 시간(KST) 기준 지난주 월요일~일요일 날짜 문자열 반환
 */
export function getLastWeekRangeKST(): { monday: string; sunday: string } {
  const { monday } = getCurrentWeekRangeKST()
  const [y, m, d] = monday.split("-").map(Number)
  const thisMondayUTC = new Date(Date.UTC(y, m - 1, d - 1, 15, 0, 0, 0))
  const lastMondayUTC = new Date(thisMondayUTC.getTime() - 7 * 86400000)
  const lastSundayUTC = new Date(lastMondayUTC.getTime() + 6 * 86400000)
  return {
    monday: getKoreaDate(lastMondayUTC),
    sunday: getKoreaDate(lastSundayUTC),
  }
}

/**
 * 한국 시간(KST) 기준 지난주 ISO 주 문자열 (예: "2026-W04")
 */
export function getLastWeekISOStringKST(): string {
  const { monday } = getLastWeekRangeKST()
  const [y, m, d] = monday.split("-").map(Number)
  const kstMidnight = new Date(Date.UTC(y, m - 1, d - 1, 15, 0, 0, 0))
  const thursdayUTC = new Date(kstMidnight.getTime() + 3 * 86400000)
  const year = thursdayUTC.getUTCFullYear()
  const week1Thursday = new Date(Date.UTC(year, 0, 1))
  const weekNo = 1 + Math.floor((thursdayUTC.getTime() - week1Thursday.getTime()) / 604800000)
  return `${year}-W${String(weekNo).padStart(2, "0")}`
}

/** YYYY-MM-DD 문자열의 요일 인덱스 (0=일, 1=월, ...) - KST 기준 */
export function getWeekdayIndexKST(ymd: string): number {
  const [y, m, d] = ymd.split("-").map(Number)
  const utc = new Date(Date.UTC(y, m - 1, d - 1, 15, 0, 0, 0))
  return utc.getUTCDay()
}

export function getWeekdayLabelKST(ymd: string): string {
  return WEEKDAY_KO[getWeekdayIndexKST(ymd)] ?? ""
}

/**
 * ISO 문자열(UTC)을 한국 시간 기준 날짜로 변환
 * 00:00 KST ~ 23:59 KST 를 그날로 처리
 * @param isoString ISO 형식의 시간 문자열
 * @returns "YYYY-MM-DD" 형식의 날짜 문자열
 */
export const getKoreaDateFromISO = (isoString: string): string => {
  const date = new Date(isoString)
  return getKoreaDate(date)
}
