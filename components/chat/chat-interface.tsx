'use client'

import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { useEffect, useRef, useState } from 'react'
import { ChatInput } from './chat-input'
import { MessageBubble, TypingIndicator } from './message-bubble'
import type { SourceCitation } from '@/types'

interface Props {
  initialQuery?: string
}

export function ChatInterface({ initialQuery }: Props) {
  const [sourcesMap, setSourcesMap] = useState<Record<string, SourceCitation[]>>({})
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const pendingSourcesRef = useRef<SourceCitation[]>([])
  const initialQuerySent = useRef(false)

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
  const isSubmitted = status === 'submitted'

  // Dispara a pergunta inicial vinda da Home
  useEffect(() => {
    if (initialQuery && !initialQuerySent.current) {
      initialQuerySent.current = true
      sendMessage({ text: initialQuery })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-4 py-6 bg-gray-50">
        <div className="max-w-3xl mx-auto">
          {messages.length === 0 && (
            <div className="text-center pt-16">
              <div className="w-14 h-14 rounded-full bg-[#003366] flex items-center justify-center text-white text-xl font-bold mx-auto mb-4">
                O
              </div>
              <p className="text-gray-400 text-sm">Faça sua pergunta abaixo</p>
            </div>
          )}

          {messages
            .filter((message) => {
              if (message.role !== 'assistant') return true
              const hasText = getMessageText(message.parts as Array<{ type: string; text?: string }>).trim().length > 0
              const hasActiveTool = (message.parts as Array<{ type: string; state?: string }> ?? []).some(
                (p) => p.type.startsWith('tool-') && (p.state === 'input-streaming' || p.state === 'input-available')
              )
              return hasText || hasActiveTool
            })
            .map((message) => (
              <MessageBubble
                key={message.id}
                role={message.role as 'user' | 'assistant'}
                content={getMessageText(message.parts as Array<{ type: string; text?: string }>)}
                sources={message.role === 'assistant' ? sourcesMap[message.id] : undefined}
                parts={message.role === 'assistant' ? (message.parts as Array<{ type: string; [key: string]: unknown }>) : undefined}
              />
            ))}

          {isSubmitted && <TypingIndicator />}
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
