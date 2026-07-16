/**
 * 두 반개방 시간 구간 [start, end)의 겹치는 시간을 초 단위로 내림합니다.
 */
export function calculateHalfOpenOverlapSeconds(
  sessionStartMs: number,
  sessionEndMs: number,
  assignmentStartMs: number,
  assignmentEndMs: number,
): number {
  if (
    ![sessionStartMs, sessionEndMs, assignmentStartMs, assignmentEndMs].every(
      Number.isFinite,
    ) ||
    sessionEndMs <= sessionStartMs ||
    assignmentEndMs <= assignmentStartMs
  ) {
    return 0
  }

  const overlapMs =
    Math.min(sessionEndMs, assignmentEndMs) -
    Math.max(sessionStartMs, assignmentStartMs)
  return Math.max(0, Math.floor(overlapMs / 1000))
}

export function effectiveAssignmentEndMs(
  readingEndAt: string,
  stoppedAt?: string,
): number {
  const readingEndMs = new Date(readingEndAt).getTime()
  if (!stoppedAt) return readingEndMs
  const stoppedAtMs = new Date(stoppedAt).getTime()
  return Number.isFinite(stoppedAtMs)
    ? Math.min(readingEndMs, stoppedAtMs)
    : readingEndMs
}
