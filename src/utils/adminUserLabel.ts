export type AdminUserListItem = {
  uid: string
  displayName: string | null
  email: string | null
  bookCount?: number
}

export const ADMIN_ALL_USERS_VALUE = "__all__"

function shortUid(uid: string): string {
  if (uid.length <= 10) return uid
  return `${uid.slice(0, 8)}…`
}

/** 관리자 드롭다운·CSV «읽은 사람»용 표시 이름 */
export function getReaderDisplayName(user: AdminUserListItem | null, uid: string): string {
  const name = user?.displayName?.trim()
  const email = user?.email?.trim()
  if (name) return name
  if (email) return email
  return `이름 없음 (${shortUid(uid)})`
}

/** 유저 선택 목록 라벨 (이름 · 이메일 · 서재 권수) */
export function formatAdminUserSelectLabel(user: AdminUserListItem): string {
  const name = user.displayName?.trim()
  const email = user.email?.trim()
  const count =
    user.bookCount != null && user.bookCount > 0
      ? ` · ${user.bookCount}권`
      : ""

  if (name && email) return `${name} (${email})${count}`
  if (name) return `${name}${count}`
  if (email) return `${email}${count}`
  return `이름·이메일 없음 · ${shortUid(user.uid)}${count}`
}
