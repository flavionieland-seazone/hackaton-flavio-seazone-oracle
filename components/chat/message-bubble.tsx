'use client'

import { useState } from 'react'
import type { SourceCitation } from '@/types'
import { SourceCards } from './source-card'

type Part = { type: string; [key: string]: unknown }

interface MessageBubbleProps {
  role: 'user' | 'assistant'
  content: string
  sources?: SourceCitation[]
  parts?: Part[]
}

const DATA_TOOLS = new Set([
  'metabase_run_sql',
  'metabase_run_card',
  'metabase_search_cards',
  'metabase_explore_schema',
  'nekt_query',
])

const TOOL_PROGRESS_LABELS: Record<string, string> = {
  metabase_run_sql: 'Executando SQL no Metabase...',
  metabase_run_card: 'Executando relatório...',
  metabase_search_cards: 'Buscando relatórios no Metabase...',
  metabase_explore_schema: 'Explorando estrutura do banco...',
  nekt_query: 'Consultando dados na Nekt...',
}

const TABLE_LABELS: Record<string, string> = {
  reservation_reservation: 'Reservation',
  property_property: 'Property',
  account_address: 'Address',
  account_host: 'Host',
  account_owner: 'Owner',
  account_guest: 'Guest',
  account_partner: 'Partner',
  reservation_ota: 'OTA',
  property_location: 'Location',
  property_categorylocation: 'Category Location',
  property_category: 'Category',
  'szi.spot_buildings': 'Spot Buildings',
  'szi.spot_building_units': 'Spot Building Units',
  'szi.spot_building_unit_contracts': 'Spot Contracts',
  'szi.financing_flows': 'Financing Flows',
  'szi.financing_flow_installments': 'Financing Installments',
}

function extractTableNames(sql: string): string[] {
  const seen = new Set<string>()
  for (const m of sql.matchAll(/(?:FROM|JOIN)\s+([\w.]+)/gi)) {
    const t = m[1]
    if (!t.toLowerCase().startsWith('information_schema')) seen.add(t)
  }
  return [...seen]
}

function ToolProgressIndicator({ parts }: { parts: Part[] }) {
  // Find tools that are running (input available but output not yet ready)
  const activeParts = parts.filter(
    (p) =>
      p.type.startsWith('tool-') &&
      (p.state === 'input-streaming' || p.state === 'input-available')
  )

  if (activeParts.length === 0) return null

  const lastActive = activeParts[activeParts.length - 1]
  const toolName = lastActive.type.slice(5)
  const label = TOOL_PROGRESS_LABELS[toolName] ?? 'Processando...'

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: 'rgba(150,180,255,0.7)', marginTop: '0.5rem' }}>
      <svg
        style={{ width: '0.875rem', height: '0.875rem', animation: 'spin 1s linear infinite', color: 'rgba(150,180,255,0.9)', flexShrink: 0 }}
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
      </svg>
      <span>{label}</span>
    </div>
  )
}

export function MessageBubble({ role, content, sources, parts }: MessageBubbleProps) {
  const [showReasoning, setShowReasoning] = useState(false)
  const isUser = role === 'user'
  const allParts = parts ?? []

  // Collect completed tool invocations from parts
  const completedToolParts = allParts.filter(
    (p) => p.type.startsWith('tool-') && p.state === 'output-available'
  )
  const metabaseParts = completedToolParts.filter((p) => DATA_TOOLS.has(p.type.slice(5)))

  // Extract table names from SQL queries for attribution
  const allTableNames: string[] = []
  for (const p of completedToolParts) {
    if (p.type === 'tool-metabase_run_sql') {
      const input = p.input as { sql?: string }
      if (input?.sql) allTableNames.push(...extractTableNames(input.sql))
    }
  }
  const uniqueTables = [...new Set(allTableNames)]
  const hasMetabase = metabaseParts.length > 0

  const hasContent = content.trim().length > 0

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-5`}>
      {!isUser && (
        <div style={{
          width: '2rem', height: '2rem', borderRadius: '50%',
          background: 'linear-gradient(135deg, #2a4a8a, #5a2a9a)',
          border: '1px solid rgba(150,180,255,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'white', fontSize: '0.7rem', fontWeight: 700,
          marginRight: '0.5rem', marginTop: '0.25rem', flexShrink: 0
        }}>
          O
        </div>
      )}
      <div className={`max-w-[78%] ${isUser ? '' : 'flex flex-col'}`}>
        {/* Message bubble — only render if there's content */}
        {(isUser || hasContent) && (
          <div
            style={isUser ? {
              background: 'linear-gradient(135deg, #1a3a7a, #3a1a6a)',
              border: '1px solid rgba(150,180,255,0.2)',
              color: 'rgba(220,235,255,0.95)',
              borderRadius: '1rem',
              borderBottomRightRadius: '0.25rem',
              padding: '0.75rem 1rem',
              fontSize: '0.875rem',
              lineHeight: '1.6'
            } : {
              background: 'rgba(255,255,255,0.07)',
              border: '1px solid rgba(150,180,255,0.15)',
              backdropFilter: 'blur(8px)',
              color: 'rgba(220,235,255,0.95)',
              borderRadius: '1rem',
              borderBottomLeftRadius: '0.25rem',
              padding: '0.75rem 1rem',
              fontSize: '0.875rem',
              lineHeight: '1.6'
            }}
          >
            {isUser ? (
              <p className="whitespace-pre-wrap">{content}</p>
            ) : (
              <div
                className="prose prose-sm max-w-none prose-invert prose-p:my-1 prose-li:my-0"
                style={{ color: 'rgba(220,235,255,0.95)' }}
                dangerouslySetInnerHTML={{ __html: markdownToHtml(content) }}
              />
            )}
          </div>
        )}

        {/* Tool progress indicator (shown while tools are running) */}
        {!isUser && <ToolProgressIndicator parts={allParts} />}

        {/* Attribution + reasoning toggle (shown after tools complete) */}
        {!isUser && hasMetabase && (
          <div style={{ marginTop: '0.375rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: 'rgba(120,160,255,0.55)' }}>
            <em>
              {metabaseParts.some((p) => p.type === 'tool-nekt_query') ? 'Fonte: Nekt' : 'Fonte: Metabase'}
              {uniqueTables.length > 0 &&
                ` — ${uniqueTables.map((t) => TABLE_LABELS[t.toLowerCase()] ?? t).join(', ')}`}
            </em>
            <button
              onClick={() => setShowReasoning((v) => !v)}
              style={{ display: 'flex', alignItems: 'center', gap: '0.125rem', background: 'none', border: 'none', color: 'rgba(120,160,255,0.55)', cursor: 'pointer', padding: 0, fontSize: '0.75rem', transition: 'color 0.15s' }}
              onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.color = 'rgba(180,210,255,0.9)'}
              onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.color = 'rgba(120,160,255,0.55)'}
              title={showReasoning ? 'Ocultar raciocínio' : 'Ver raciocínio'}
            >
              <svg
                style={{ width: '0.875rem', height: '0.875rem', transition: 'transform 0.15s', transform: showReasoning ? 'rotate(180deg)' : 'rotate(0deg)' }}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
              {showReasoning ? 'ocultar' : 'raciocínio'}
            </button>
          </div>
        )}

        {/* Reasoning panel */}
        {!isUser && showReasoning && (
          <div style={{ marginTop: '0.5rem', background: 'rgba(20,30,60,0.6)', border: '1px solid rgba(100,140,255,0.2)', borderRadius: '0.75rem', padding: '0.75rem', fontSize: '0.75rem', backdropFilter: 'blur(8px)' }}>
            {metabaseParts.map((p, i) => {
              const toolName = p.type.slice(5)
              const input = p.input as Record<string, unknown>
              return (
                <div
                  key={(p.toolCallId as string) ?? i}
                  style={i > 0 ? { marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(100,140,255,0.15)' } : {}}
                >
                  {toolName === 'metabase_run_sql' && (
                    <>
                      <div style={{ color: 'rgba(150,180,255,0.7)', fontWeight: 500, marginBottom: '0.25rem' }}>SQL executado:</div>
                      <pre style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(100,140,255,0.15)', borderRadius: '0.375rem', padding: '0.5rem', overflowX: 'auto', color: 'rgba(200,220,255,0.85)', whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: 'monospace', fontSize: '0.6875rem' }}>
                        {String(input.sql ?? '').trim()}
                      </pre>
                    </>
                  )}
                  {toolName === 'metabase_run_card' && (
                    <div style={{ color: 'rgba(150,180,255,0.7)' }}>
                      Relatório Metabase <strong style={{ color: 'rgba(200,220,255,0.9)' }}>#{String(input.card_id ?? '')}</strong>
                    </div>
                  )}
                  {toolName === 'metabase_search_cards' && (
                    <div style={{ color: 'rgba(150,180,255,0.7)' }}>
                      Busca no Metabase: <em style={{ color: 'rgba(200,220,255,0.85)' }}>&ldquo;{String(input.query ?? '')}&rdquo;</em>
                    </div>
                  )}
                  {toolName === 'metabase_explore_schema' && (
                    <div style={{ color: 'rgba(150,180,255,0.7)' }}>
                      Schema explorado:{' '}
                      <strong style={{ color: 'rgba(200,220,255,0.9)' }}>{String(input.table_name ?? input.schema_name ?? 'public')}</strong>
                    </div>
                  )}
                  {toolName === 'nekt_query' && (
                    <div style={{ color: 'rgba(150,180,255,0.7)' }}>
                      Consulta Nekt:{' '}
                      <em style={{ color: 'rgba(200,220,255,0.85)' }}>&ldquo;{String(input.question ?? '')}&rdquo;</em>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {!isUser && sources && sources.length > 0 && <SourceCards sources={sources} />}
      </div>
    </div>
  )
}

export function TypingIndicator() {
  return (
    <div className="flex justify-start mb-5">
      <div className="w-8 h-8 rounded-full bg-[#003366] flex items-center justify-center text-white text-xs font-bold mr-2 mt-1 flex-shrink-0">
        O
      </div>
      <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
        <div className="flex gap-1 items-center h-4">
          <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0ms]" />
          <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:150ms]" />
          <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:300ms]" />
        </div>
      </div>
    </div>
  )
}

// Conversão markdown simples (sem dependência extra)
function markdownToHtml(md: string): string {
  return md
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code style="background:rgba(100,140,255,0.15);padding:0 0.25rem;border-radius:0.25rem;font-size:0.75rem;color:rgba(200,220,255,0.95)">$1</code>')
    .replace(/^### (.+)$/gm, '<h3 style="font-weight:600;font-size:0.875rem;margin-top:0.75rem;margin-bottom:0.25rem;color:rgba(200,220,255,0.95)">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 style="font-weight:600;margin-top:0.75rem;margin-bottom:0.25rem;color:rgba(200,220,255,0.95)">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 style="font-weight:700;margin-top:0.75rem;margin-bottom:0.25rem;color:rgba(220,235,255,1)">$1</h1>')
    .replace(/^\- (.+)$/gm, '<li style="margin-left:1rem;list-style:disc;list-style-position:inside">$1</li>')
    .replace(/^(\d+)\. (.+)$/gm, '<li style="margin-left:1rem;list-style:decimal;list-style-position:inside">$2</li>')
    .replace(/\[(.+?)\]\((.+?)\)/g, (_, text, url) =>
      url.startsWith('http://') || url.startsWith('https://')
        ? `<a href="${url}" target="_blank" rel="noopener noreferrer" style="color:rgba(150,180,255,0.9);text-decoration:underline">${text}</a>`
        : text
    )
    .replace(/\n{2,}/g, '</p><p style="margin-top:0.5rem">')
    .replace(/\n/g, '<br/>')
}
