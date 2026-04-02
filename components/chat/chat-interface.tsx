'use client'

import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
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

  useEffect(() => {
    if (initialQuery && !initialQuerySent.current) {
      initialQuerySent.current = true
      sendMessage({ text: initialQuery })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
    <div className="flex flex-col h-full" style={{ background: '#080b1a', position: 'relative' }}>

      {/* Fundo cósmico */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
        background: 'radial-gradient(ellipse at 60% 30%, #1a0a3a 0%, #080b1a 60%)',
      }}>
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: `
            radial-gradient(1px 1px at 8% 12%, rgba(255,255,255,0.7) 0%, transparent 100%),
            radial-gradient(1px 1px at 22% 38%, rgba(255,255,255,0.5) 0%, transparent 100%),
            radial-gradient(1.5px 1.5px at 38% 8%, rgba(255,255,255,0.8) 0%, transparent 100%),
            radial-gradient(1px 1px at 52% 52%, rgba(255,255,255,0.4) 0%, transparent 100%),
            radial-gradient(1px 1px at 68% 18%, rgba(255,255,255,0.6) 0%, transparent 100%),
            radial-gradient(1.5px 1.5px at 78% 68%, rgba(255,255,255,0.7) 0%, transparent 100%),
            radial-gradient(1px 1px at 88% 38%, rgba(255,255,255,0.5) 0%, transparent 100%),
            radial-gradient(1px 1px at 12% 72%, rgba(255,255,255,0.4) 0%, transparent 100%),
            radial-gradient(1px 1px at 32% 82%, rgba(255,255,255,0.6) 0%, transparent 100%),
            radial-gradient(2px 2px at 58% 78%, rgba(180,160,255,0.5) 0%, transparent 100%),
            radial-gradient(1px 1px at 72% 88%, rgba(255,255,255,0.3) 0%, transparent 100%),
            radial-gradient(1.5px 1.5px at 83% 12%, rgba(255,255,255,0.8) 0%, transparent 100%)
          `
        }} />
        {/* Nebulosa */}
        <div style={{
          position: 'absolute', top: '5%', right: '8%', width: '250px', height: '250px',
          background: 'radial-gradient(ellipse, rgba(120,40,180,0.12) 0%, transparent 70%)',
          borderRadius: '50%', filter: 'blur(35px)'
        }} />
      </div>

      {/* Logo translúcida centralizada */}
      <div style={{
        position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        pointerEvents: 'none', zIndex: 1, opacity: 0.05
      }}>
        <Image src="/oracle-logo.jpg" alt="" width={400} height={400} style={{ borderRadius: '1rem' }} />
      </div>

      {/* Mensagens */}
      <div className="flex-1 overflow-y-auto px-4 py-6" style={{ position: 'relative', zIndex: 2 }}>
        <div className="max-w-3xl mx-auto">
          {messages.length === 0 && (
            <div className="text-center pt-16">
              <div style={{
                width: '3rem', height: '3rem', borderRadius: '50%',
                background: 'linear-gradient(135deg, #2a4a8a, #5a2a9a)',
                border: '1px solid rgba(150,180,255,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'white', fontWeight: 700, margin: '0 auto 1rem',
                boxShadow: '0 0 15px rgba(100,140,255,0.2)'
              }}>O</div>
              <p style={{ color: 'rgba(160,190,255,0.5)', fontSize: '0.875rem' }}>Faça sua pergunta abaixo</p>
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
