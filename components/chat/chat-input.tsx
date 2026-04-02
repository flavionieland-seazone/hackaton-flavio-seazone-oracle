'use client'

import type { FormEvent } from 'react'
import { Send } from 'lucide-react'

interface ChatInputProps {
  input: string
  onInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
  onSubmit: (e: FormEvent<HTMLFormElement>) => void
  isLoading: boolean
}

export function ChatInput({ input, onInputChange, onSubmit, isLoading }: ChatInputProps) {
  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (!isLoading && input.trim()) {
        e.currentTarget.form?.requestSubmit()
      }
    }
  }

  return (
    <form onSubmit={onSubmit} className="border-t border-gray-200 bg-white p-4">
      <div className="flex gap-2 items-end max-w-3xl mx-auto">
        <textarea
          value={input}
          onChange={onInputChange}
          onKeyDown={handleKeyDown}
          placeholder="Faça uma pergunta sobre a Seazone..."
          rows={1}
          disabled={isLoading}
          className="flex-1 resize-none rounded-xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#003366] focus:border-transparent disabled:opacity-50 max-h-32 overflow-y-auto"
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="bg-[#003366] text-white rounded-xl px-4 py-3 hover:bg-[#002244] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
      <p className="text-xs text-gray-400 text-center mt-2 max-w-3xl mx-auto">
        Enter para enviar · Shift+Enter para nova linha
      </p>
    </form>
  )
}
