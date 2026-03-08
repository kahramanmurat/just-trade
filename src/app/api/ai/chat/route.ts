// POST /api/ai/chat — AI assistant for chart analysis questions
// Returns informational analysis only, not financial advice.

import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'
import { resolveUser } from '@/lib/db/resolveUser'
import type { ApiError, AiChatResponse } from '@/lib/api/types'

const indicatorSchema = z.object({
  type: z.string(),
  period: z.number(),
  visible: z.boolean(),
})

const chatSchema = z.object({
  message: z.string().min(1, 'Message is required').max(1000, 'Message too long'),
  context: z.object({
    symbol: z.string(),
    timeframe: z.string(),
    indicators: z.array(indicatorSchema),
    watchlist: z.array(z.string()),
  }),
})

function buildSystemPrompt(context: {
  symbol: string
  timeframe: string
  indicators: { type: string; period: number; visible: boolean }[]
  watchlist: string[]
}): string {
  const visibleIndicators = context.indicators.filter((i) => i.visible)
  const indicatorList = visibleIndicators.length > 0
    ? visibleIndicators.map((i) => `${i.type}(${i.period})`).join(', ')
    : 'none'

  const watchlistStr = context.watchlist.length > 0
    ? context.watchlist.join(', ')
    : 'empty'

  return `You are JustTrade AI, a helpful trading assistant embedded in a charting dashboard.

Current chart context:
- Symbol: ${context.symbol}
- Timeframe: ${context.timeframe}
- Active indicators: ${indicatorList}
- Watchlist symbols: ${watchlistStr}

Guidelines:
- Provide clear, concise analysis based on the user's chart setup.
- Explain what indicators suggest in plain language.
- When discussing price action, reference the active timeframe.
- Keep responses under 300 words unless the user asks for detail.
- Use markdown formatting for readability (bold, lists, etc).
- IMPORTANT: Always include a brief disclaimer that this is informational analysis, not financial advice. Do not recommend specific buy/sell actions. Use phrases like "indicators suggest" or "historically this pattern has been associated with" rather than "you should buy/sell".
- If the user asks about symbols not on their chart, answer generally but note you don't have live data for those symbols.`
}

let _client: Anthropic | null = null

function getClient(): Anthropic {
  if (!_client) {
    const key = process.env.ANTHROPIC_API_KEY
    if (!key) throw new Error('ANTHROPIC_API_KEY is not set')
    _client = new Anthropic({ apiKey: key })
  }
  return _client
}

export async function POST(request: Request) {
  const { userId: clerkId } = await auth()
  if (!clerkId) {
    return NextResponse.json<ApiError>({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = await resolveUser(clerkId)
  if (!user) {
    return NextResponse.json<ApiError>(
      { error: 'User not found', code: 'USER_NOT_FOUND' },
      { status: 404 }
    )
  }

  const body = await request.json().catch(() => null)
  const parsed = chatSchema.safeParse(body)

  if (!parsed.success) {
    const message = parsed.error.issues.map((i) => i.message).join('; ')
    return NextResponse.json<ApiError>(
      { error: message, code: 'VALIDATION_ERROR' },
      { status: 400 }
    )
  }

  const { message, context } = parsed.data

  try {
    const client = getClient()

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: buildSystemPrompt(context),
      messages: [{ role: 'user', content: message }],
    })

    const textBlock = response.content.find((b) => b.type === 'text')
    const reply = textBlock?.text ?? 'No response generated.'

    return NextResponse.json<AiChatResponse>({ reply })
  } catch (err) {
    const errMessage = err instanceof Error ? err.message : 'AI request failed'
    return NextResponse.json<ApiError>(
      { error: errMessage, code: 'AI_ERROR' },
      { status: 500 }
    )
  }
}
