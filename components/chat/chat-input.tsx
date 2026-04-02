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
    <form onSubmit={onSubmit} style={{
      borderTop: '1px solid rgba(150,180,255,0.1)',
      background: 'rgba(8,11,26,0.95)',
      backdropFilter: 'blur(12px)',
      padding: '1rem',
      position: 'relative', zIndex: 2
    }}>
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end', maxWidth: '48rem', margin: '0 auto' }}>
        <textarea
          value={input}
          onChange={onInputChange}
          onKeyDown={handleKeyDown}
          placeholder="Faça uma pergunta sobre a Seazone..."
          rows={1}
          disabled={isLoading}
          style={{
            flex: 1, resize: 'none', borderRadius: '0.75rem',
            border: '1px solid rgba(150,180,255,0.2)',
            padding: '0.75rem 1rem',
            fontSize: '0.875rem',
            background: 'rgba(255,255,255,0.05)',
            color: 'rgba(220,235,255,0.9)',
            outline: 'none',
            maxHeight: '8rem',
            overflowY: 'auto',
            opacity: isLoading ? 0.5 : 1
          }}
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          style={{
            background: isLoading || !input.trim()
              ? 'rgba(255,255,255,0.1)'
              : 'linear-gradient(135deg, #2a4a8a, #5a2a9a)',
            border: '1px solid rgba(150,180,255,0.2)',
            color: 'white',
            borderRadius: '0.75rem',
            padding: '0.75rem 1rem',
            cursor: isLoading || !input.trim() ? 'not-allowed' : 'pointer',
            opacity: isLoading || !input.trim() ? 0.4 : 1,
            transition: 'all 0.2s'
          }}
        >
          <Send style={{ width: '1rem', height: '1rem' }} />
        </button>
      </div>
      <p style={{ fontSize: '0.7rem', color: 'rgba(150,180,255,0.3)', textAlign: 'center', marginTop: '0.5rem', maxWidth: '48rem', margin: '0.5rem auto 0' }}>
        Enter para enviar · Shift+Enter para nova linha
      </p>
    </form>
  )
}
