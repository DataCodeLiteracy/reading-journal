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
