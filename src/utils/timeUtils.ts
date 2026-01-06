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
 * 새벽 01:00 이전은 전날로 처리
 * @param date Date 객체 (로컬 시간 또는 UTC 시간)
 * @returns "YYYY-MM-DD" 형식의 날짜 문자열
 */
export const getKoreaDate = (date: Date): string => {
  // Date 객체의 UTC 타임스탬프를 가져와서 한국 시간(UTC+9)으로 변환
  const utcTimestamp = date.getTime()
  const koreaTimestamp = utcTimestamp + 9 * 60 * 60 * 1000
  const koreaTime = new Date(koreaTimestamp)

  // 한국 시간 기준으로 년, 월, 일 추출 (UTC 메서드를 사용하여 변환된 시간 기준)
  const year = koreaTime.getUTCFullYear()
  const month = String(koreaTime.getUTCMonth() + 1).padStart(2, "0")
  const day = String(koreaTime.getUTCDate()).padStart(2, "0")

  // 한국 시간 기준 시간 추출
  const hour = koreaTime.getUTCHours()

  // 새벽 01:00 이전이면 전날로 처리
  if (hour < 1) {
    const previousDay = new Date(koreaTimestamp - 24 * 60 * 60 * 1000)
    const prevYear = previousDay.getUTCFullYear()
    const prevMonth = String(previousDay.getUTCMonth() + 1).padStart(2, "0")
    const prevDay = String(previousDay.getUTCDate()).padStart(2, "0")
    return `${prevYear}-${prevMonth}-${prevDay}`
  }

  return `${year}-${month}-${day}`
}

/**
 * ISO 문자열(UTC)을 한국 시간 기준 날짜로 변환
 * 새벽 01:00 이전은 전날로 처리
 * @param isoString ISO 형식의 시간 문자열
 * @returns "YYYY-MM-DD" 형식의 날짜 문자열
 */
export const getKoreaDateFromISO = (isoString: string): string => {
  const date = new Date(isoString)
  return getKoreaDate(date)
}
