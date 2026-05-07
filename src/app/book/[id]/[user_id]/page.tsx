import BookDetailPageClient from "./BookDetailPageClient"

export default async function BookDetailPage({
  params,
}: {
  params: Promise<{ id: string; user_id: string }>
}) {
  const { id, user_id } = await params
  return (
    <BookDetailPageClient key={`${id}-${user_id}`} id={id} user_id={user_id} />
  )
}
