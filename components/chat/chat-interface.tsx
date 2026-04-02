'use client'

import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { useEffect, useRef, useState } from 'react'
import { ChatInput } from './chat-input'
import { MessageBubble, TypingIndicator } from './message-bubble'
import type { SourceCitation } from '@/types'

const SUGGESTED_QUESTIONS = [
  'O que é a Seazone e quais são seus produtos?',
  'Como funciona a gestão completa (GC)?',
  'Quais são os contratos disponíveis para proprietários?',
  'Como funciona o processo de onboarding de um novo imóvel?',
]

export function ChatInterface() {
  const [sourcesMap, setSourcesMap] = useState<Record<string, SourceCitation[]>>({})
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const pendingSourcesRef = useRef<SourceCitation[]>([])

  const transport = useRef(
    new DefaultChatTransport({
      api: '/api/chat',
      fetch: async (url, init) => {
        const res = await globalThis.fetch(url, init)
        const sourcesB64 = res.headers.get('x-sources')
        if (sourcesB64) {
          try {
            pendingSourcesRef.current = JSON.parse(atob(sourcesB64))
          } catch {}
        }
        return res
      },
    })
  ).current

  const { messages, sendMessage, status } = useChat({ transport })
  const isLoading = status === 'submitted' || status === 'streaming'

  // Quando streaming termina, associa sources à última mensagem do assistente
  useEffect(() => {
    if (status === 'ready' && pendingSourcesRef.current.length > 0) {
      const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant')
      if (lastAssistant) {
        setSourcesMap((prev) => ({ ...prev, [lastAssistant.id]: pendingSourcesRef.current }))
        pendingSourcesRef.current = []
      }
    }
  }, [status, messages])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  function getMessageText(parts: Array<{ type: string; text?: string }>): string {
    return parts
      .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
      .map((p) => p.text)
      .join('')
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!input.trim() || isLoading) return
    sendMessage({ text: input.trim() })
    setInput('')
  }

  function handleInputChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value)
  }

  function handleSuggestedQuestion(q: string) {
    sendMessage({ text: q })
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-4 py-6 bg-gray-50">
        <div className="max-w-3xl mx-auto">
          {messages.length === 0 && (
            <div className="text-center pt-12 pb-8">
              <div className="w-16 h-16 rounded-full bg-[#003366] flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4">
                O
              </div>
              <h2 className="text-xl font-semibold text-gray-800 mb-2">Olá! Sou o Seazone Oracle</h2>
              <p className="text-gray-500 text-sm mb-8 max-w-md mx-auto">
                Seu assistente de conhecimento interno. Pergunte sobre produtos, contratos, processos e muito mais.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-lg mx-auto">
                {SUGGESTED_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    onClick={() => handleSuggestedQuestion(q)}
                    className="text-left text-sm bg-white border border-gray-200 rounded-xl px-4 py-3 text-gray-700 hover:border-[#003366] hover:text-[#003366] transition-colors shadow-sm"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((message) => (
            <MessageBubble
              key={message.id}
              role={message.role as 'user' | 'assistant'}
              content={getMessageText(message.parts as Array<{ type: string; text?: string }>)}
              sources={message.role === 'assistant' ? sourcesMap[message.id] : undefined}
            />
          ))}

          {isLoading && <TypingIndicator />}
          <div ref={bottomRef} />
        </div>
      </div>

      <ChatInput
        input={input}
        onInputChange={handleInputChange}
        onSubmit={handleSubmit}
        isLoading={isLoading}
      />
    </div>
  )
}
