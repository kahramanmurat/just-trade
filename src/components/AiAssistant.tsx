'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useAiStore } from '@/lib/store/aiStore'
import { useChartStore } from '@/lib/store/chartStore'
import type { AiChatResponse } from '@/lib/api/types'

const QUICK_PROMPTS = [
  'Summarize my current chart setup',
  'What do the active indicators suggest?',
  'Summarize my watchlist',
  'Explain the current timeframe choice',
]

export default function AiAssistant() {
  const { open, messages, loading, setOpen, addMessage, setLoading, clearMessages } = useAiStore()
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  // Focus input when panel opens
  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  // Focus trap — cycle Tab between first and last focusable elements
  useEffect(() => {
    if (!open) return
    const panel = panelRef.current
    if (!panel) return
    function handleTab(e: KeyboardEvent) {
      if (e.key !== 'Tab') return
      const focusable = panel!.querySelectorAll<HTMLElement>(
        'input, button, [tabindex]:not([tabindex="-1"])'
      )
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', handleTab)
    return () => document.removeEventListener('keydown', handleTab)
  }, [open])

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || loading) return

    const state = useChartStore.getState()
    const context = {
      symbol: state.symbol,
      timeframe: state.timeframe,
      indicators: state.indicators.map((i) => ({
        type: i.type,
        period: i.period,
        visible: i.visible,
      })),
      watchlist: [] as string[],
    }

    // Fetch watchlist symbols for context
    try {
      const wlRes = await fetch('/api/watchlists', { cache: 'no-store' })
      if (wlRes.ok) {
        const wlData = await wlRes.json()
        context.watchlist = wlData.items?.map((i: { symbol: string }) => i.symbol) ?? []
      }
    } catch {
      // Watchlist context is optional
    }

    addMessage({ role: 'user', content: text.trim() })
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text.trim(), context }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: 'Request failed' }))
        addMessage({ role: 'assistant', content: `Error: ${body.error ?? 'Something went wrong'}` })
        return
      }

      const data: AiChatResponse = await res.json()
      addMessage({ role: 'assistant', content: data.reply })
    } catch {
      addMessage({ role: 'assistant', content: 'Error: Network error. Please try again.' })
    } finally {
      setLoading(false)
    }
  }, [loading, addMessage, setLoading])

  if (!open) return null

  return (
    <div
      ref={panelRef}
      className="fixed bottom-4 right-4 z-50 w-[380px] max-h-[520px] flex flex-col bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg shadow-2xl overflow-hidden"
      role="dialog"
      aria-label="AI Assistant"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-[var(--color-border)] shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-[var(--color-accent)] flex items-center justify-center shrink-0">
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden="true">
              <path
                d="M5.5 1L7 4L10.5 4.5L8 7L8.5 10.5L5.5 9L2.5 10.5L3 7L0.5 4.5L4 4L5.5 1Z"
                fill="white"
                fillOpacity="0.9"
              />
            </svg>
          </div>
          <span className="text-[var(--color-text)] text-xs font-semibold">JustTrade AI</span>
          <span className="text-[var(--color-text-muted)] text-[9px] font-mono">BETA</span>
        </div>
        <div className="flex items-center gap-1">
          {messages.length > 0 && (
            <button
              onClick={clearMessages}
              className="text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] text-[10px] px-1.5 py-0.5 rounded hover:bg-[var(--color-surface-2)] transition-colors"
              aria-label="Clear chat"
            >
              Clear
            </button>
          )}
          <button
            onClick={() => setOpen(false)}
            className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] text-lg leading-none px-1 transition-colors"
            aria-label="Close AI assistant"
          >
            ×
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-3 min-h-0">
        {messages.length === 0 && !loading && (
          <div className="py-4 space-y-3">
            <p className="text-[var(--color-text-secondary)] text-xs text-center leading-relaxed">
              Ask about your chart, indicators, or watchlist.
            </p>
            <div className="space-y-1.5">
              {QUICK_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => sendMessage(prompt)}
                  className="w-full text-left px-2.5 py-2 text-[var(--color-text-secondary)] text-[11px] border border-[var(--color-border)] rounded hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text)] transition-colors"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={msg.role === 'user' ? 'flex justify-end' : ''}>
            <div
              className={[
                'max-w-[90%] text-[11px] leading-relaxed rounded-lg px-3 py-2',
                msg.role === 'user'
                  ? 'bg-[var(--color-accent)] text-white'
                  : 'bg-[var(--color-surface-2)] text-[var(--color-text)]',
              ].join(' ')}
            >
              {msg.role === 'assistant' ? (
                <AssistantMessage content={msg.content} />
              ) : (
                <span>{msg.content}</span>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-1.5 py-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent)] animate-pulse" />
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent)] animate-pulse [animation-delay:150ms]" />
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent)] animate-pulse [animation-delay:300ms]" />
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Disclaimer */}
      <div className="px-3 py-1 border-t border-[var(--color-border)] shrink-0">
        <p className="text-[var(--color-text-muted)] text-[8px] text-center leading-tight">
          AI analysis is informational only — not financial advice. Always do your own research.
        </p>
      </div>

      {/* Input */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-t border-[var(--color-border)] shrink-0">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              sendMessage(input)
            }
          }}
          placeholder="Ask about your chart..."
          maxLength={1000}
          disabled={loading}
          className="flex-1 bg-[var(--color-bg)] text-[var(--color-text)] text-xs border border-[var(--color-border)] rounded px-2.5 py-1.5 placeholder:text-[var(--color-text-muted)] disabled:opacity-50"
          aria-label="Chat message"
        />
        <button
          onClick={() => sendMessage(input)}
          disabled={loading || !input.trim()}
          className="bg-[var(--color-accent)] text-white text-xs px-3 py-1.5 rounded hover:opacity-90 transition-opacity disabled:opacity-40 shrink-0"
          aria-label="Send message"
        >
          Send
        </button>
      </div>
    </div>
  )
}

function AssistantMessage({ content }: { content: string }) {
  // Simple markdown-like rendering: bold, lists, line breaks
  const lines = content.split('\n')

  return (
    <div className="space-y-1.5 [&_strong]:font-semibold">
      {lines.map((line, i) => {
        if (!line.trim()) return <br key={i} />

        // Bullet list items
        if (line.match(/^[-*•]\s/)) {
          const text = line.replace(/^[-*•]\s/, '')
          return (
            <div key={i} className="flex gap-1.5">
              <span className="text-[var(--color-accent)] shrink-0">•</span>
              <span dangerouslySetInnerHTML={{ __html: formatInline(text) }} />
            </div>
          )
        }

        // Numbered list items
        if (line.match(/^\d+\.\s/)) {
          const text = line.replace(/^\d+\.\s/, '')
          const num = line.match(/^(\d+)/)?.[1]
          return (
            <div key={i} className="flex gap-1.5">
              <span className="text-[var(--color-text-secondary)] shrink-0">{num}.</span>
              <span dangerouslySetInnerHTML={{ __html: formatInline(text) }} />
            </div>
          )
        }

        return <p key={i} dangerouslySetInnerHTML={{ __html: formatInline(line) }} />
      })}
    </div>
  )
}

function formatInline(text: string): string {
  // Bold: **text** → <strong>text</strong>
  return text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
}
