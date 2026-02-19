import { ApiClient } from "@/lib/apiClient"
import { GoldenBellRequest } from "@/types/goldenBell"

const COLLECTION = "goldenBellRequests"

export const GoldenBellRequestService = {
  async create(data: {
    user_id: string
    user_display_name?: string
    book_id: string
    book_title: string
  }): Promise<string> {
    const payload: Record<string, unknown> = {
      user_id: data.user_id,
      book_id: data.book_id,
      book_title: data.book_title,
      status: "pending",
    }
    if (data.user_display_name != null) payload.user_display_name = data.user_display_name
    const id = await ApiClient.createDocumentWithAutoId(COLLECTION, payload)
    return id
  },

  async getAll(): Promise<GoldenBellRequest[]> {
    const list = await ApiClient.queryDocuments<GoldenBellRequest>(
      COLLECTION,
      [],
      "created_at",
      "desc"
    )
    return list
  },

  async updateStatus(
    id: string,
    status: "pending" | "done"
  ): Promise<void> {
    await ApiClient.updateDocument(COLLECTION, id, { status })
  },
}
