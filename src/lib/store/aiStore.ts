import { create } from 'zustand'
import type { AiChatMessage } from '@/lib/api/types'

type AiState = {
  open: boolean
  messages: AiChatMessage[]
  loading: boolean
  setOpen: (open: boolean) => void
  toggleOpen: () => void
  addMessage: (message: AiChatMessage) => void
  setLoading: (loading: boolean) => void
  clearMessages: () => void
}

export const useAiStore = create<AiState>((set) => ({
  open: false,
  messages: [],
  loading: false,
  setOpen: (open) => set({ open }),
  toggleOpen: () => set((s) => ({ open: !s.open })),
  addMessage: (message) =>
    set((s) => ({ messages: [...s.messages, message] })),
  setLoading: (loading) => set({ loading }),
  clearMessages: () => set({ messages: [] }),
}))
