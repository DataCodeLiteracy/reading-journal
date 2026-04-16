import {
  READING_AI_MODEL_OPTIONS,
  type ReadingAiModelFamily,
} from "@/types/readingContent"

export function modelFamilyForId(modelId: string): ReadingAiModelFamily {
  const opt = READING_AI_MODEL_OPTIONS.find((m) => m.id === modelId)
  return opt?.family ?? "gpt4"
}

type ChatMessage = { role: "system" | "user"; content: string }

/**
 * Responses/Chat — GPT-5 계열은 max_completion_tokens 위주, GPT-4 계열은 max_tokens.
 */
export async function openaiChatJson(params: {
  model: string
  messages: ChatMessage[]
  maxOut?: number
}): Promise<{ content: string; raw: unknown }> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured")
  }

  const family = modelFamilyForId(params.model)
  const maxOut = params.maxOut ?? 1024

  const body: Record<string, unknown> = {
    model: params.model,
    messages: params.messages,
    temperature: 0.3,
  }

  if (family === "gpt5") {
    body.max_completion_tokens = maxOut
  } else {
    body.max_tokens = maxOut
  }

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  })

  const raw = (await res.json()) as Record<string, unknown>
  if (!res.ok) {
    const msg =
      typeof raw.error === "object" && raw.error !== null
        ? JSON.stringify((raw.error as { message?: string }).message ?? raw.error)
        : JSON.stringify(raw)
    throw new Error(`OpenAI API error: ${msg}`)
  }

  const choices = raw.choices as Array<{ message?: { content?: string } }>
  const content = choices?.[0]?.message?.content?.trim() ?? ""
  return { content, raw }
}
