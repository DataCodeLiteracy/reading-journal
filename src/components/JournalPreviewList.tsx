import { Fragment, type ReactNode } from "react"

interface JournalPreviewListProps<T extends { id: string }> {
  items: T[]
  renderItem: (item: T) => ReactNode
}

/** 독서일지 미리보기: 항목 사이에 여백 있는 구분선 */
export default function JournalPreviewList<T extends { id: string }>({
  items,
  renderItem,
}: JournalPreviewListProps<T>) {
  return (
    <>
      {items.map((item, index) => (
        <Fragment key={item.id}>
          {index > 0 ? (
            <div
              className='my-4 border-t border-theme-tertiary'
              aria-hidden
            />
          ) : null}
          {renderItem(item)}
        </Fragment>
      ))}
    </>
  )
}
