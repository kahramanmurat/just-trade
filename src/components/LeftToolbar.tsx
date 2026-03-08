'use client'

import { useState } from 'react'
import { useChartStore, type DrawingTool } from '@/lib/store/chartStore'

type ToolConfig = {
  tool: DrawingTool
  label: string
  shortcut: string
  icon: React.ReactNode
}

const TOOLS: ToolConfig[] = [
  {
    tool: 'select',
    label: 'Select',
    shortcut: 'Esc',
    icon: (
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
        <path
          d="M3 2.5V12L6.5 8.5L9.5 14L11 13.5L8 8H12L3 2.5Z"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    tool: 'trendline',
    label: 'Trend Line',
    shortcut: 'Alt+T',
    icon: (
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
        <path d="M2 13L13 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="2" cy="13" r="1.5" fill="currentColor" />
        <circle cx="13" cy="2" r="1.5" fill="currentColor" />
      </svg>
    ),
  },
  {
    tool: 'hline',
    label: 'Horizontal Line',
    shortcut: 'Alt+H',
    icon: (
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
        <path
          d="M1 7.5H14"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeDasharray="2 2"
        />
        <circle cx="7.5" cy="7.5" r="1.5" fill="currentColor" />
      </svg>
    ),
  },
  {
    tool: 'fibonacci',
    label: 'Fibonacci',
    shortcut: 'Alt+F',
    icon: (
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
        <path
          d="M2 4H13M2 7H13M2 9.5H13M2 12H13"
          stroke="currentColor"
          strokeWidth="1"
          strokeLinecap="round"
          strokeOpacity="0.45"
        />
        <path d="M2 4H13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    tool: 'rectangle',
    label: 'Rectangle',
    shortcut: 'Alt+R',
    icon: (
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
        <rect
          x="2"
          y="3.5"
          width="11"
          height="8"
          rx="0.5"
          stroke="currentColor"
          strokeWidth="1.5"
        />
      </svg>
    ),
  },
  {
    tool: 'text',
    label: 'Text Label',
    shortcut: 'Alt+L',
    icon: (
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
        <path
          d="M3 4H12M7.5 4V11.5M5.5 11.5H9.5"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    tool: 'magnet',
    label: 'Snap to OHLC',
    shortcut: 'Alt+M',
    icon: (
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
        <path
          d="M4 3V9C4 11 5.791 12.5 7.5 12.5C9.209 12.5 11 11 11 9V3"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <path d="M2 3H6M9 3H13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    tool: 'eraser',
    label: 'Delete Drawing',
    shortcut: 'Del',
    icon: (
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
        <path
          d="M3 13L7.5 8.5M7.5 8.5L11.5 3.5L13 5L8 10.5L5 10.5L3 13"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
]

export default function LeftToolbar() {
  const { activeTool, setActiveTool } = useChartStore()
  const [hovered, setHovered] = useState<DrawingTool | null>(null)

  return (
    <aside
      className="hidden md:flex flex-col items-center w-10 shrink-0 bg-[var(--color-surface)] border-r border-[var(--color-border)] py-1.5 gap-px"
      aria-label="Drawing tools"
    >
      {TOOLS.map(({ tool, label, shortcut, icon }) => (
        <div key={tool} className="relative w-full flex justify-center">
          <button
            onClick={() => setActiveTool(tool)}
            onMouseEnter={() => setHovered(tool)}
            onMouseLeave={() => setHovered(null)}
            className={[
              'w-8 h-8 flex items-center justify-center rounded transition-colors',
              activeTool === tool
                ? 'bg-[var(--color-accent)] text-white'
                : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-2)]',
            ].join(' ')}
            aria-label={`${label} — ${shortcut}`}
            aria-pressed={activeTool === tool}
          >
            {icon}
          </button>

          {hovered === tool && (
            <div
              className="absolute left-full top-1/2 -translate-y-1/2 ml-2 z-50 pointer-events-none"
              role="tooltip"
            >
              <div className="bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded px-2.5 py-1.5 shadow-lg whitespace-nowrap">
                <p className="text-[var(--color-text)] text-xs font-medium leading-tight">{label}</p>
                <p className="text-[var(--color-text-secondary)] text-[10px] font-mono mt-0.5">
                  {shortcut}
                </p>
              </div>
            </div>
          )}
        </div>
      ))}
    </aside>
  )
}
