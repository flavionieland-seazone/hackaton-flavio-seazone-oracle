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
    <div className="flex items-center gap-2 text-xs text-gray-500 mt-2">
      <svg
        className="w-3.5 h-3.5 animate-spin text-[#003366]"
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
        <div className="w-8 h-8 rounded-full bg-[#003366] flex items-center justify-center text-white text-xs font-bold mr-2 mt-1 flex-shrink-0">
          O
        </div>
      )}
      <div className={`max-w-[78%] ${isUser ? '' : 'flex flex-col'}`}>
        {/* Message bubble — only render if there's content */}
        {(isUser || hasContent) && (
          <div
            className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
              isUser
                ? 'bg-[#003366] text-white rounded-br-sm'
                : 'bg-white text-gray-800 border border-gray-200 rounded-bl-sm shadow-sm'
            }`}
          >
            {isUser ? (
              <p className="whitespace-pre-wrap">{content}</p>
            ) : (
              <div
                className="prose prose-sm max-w-none prose-headings:text-gray-900 prose-p:my-1 prose-li:my-0"
                dangerouslySetInnerHTML={{ __html: markdownToHtml(content) }}
              />
            )}
          </div>
        )}

        {/* Tool progress indicator (shown while tools are running) */}
        {!isUser && <ToolProgressIndicator parts={allParts} />}

        {/* Attribution + reasoning toggle (shown after tools complete) */}
        {!isUser && hasMetabase && (
          <div className="mt-1.5 flex items-center gap-2 text-xs text-gray-400">
            <em>
              {metabaseParts.some((p) => p.type === 'tool-nekt_query') ? 'Fonte: Nekt' : 'Fonte: Metabase'}
              {uniqueTables.length > 0 &&
                ` — ${uniqueTables.map((t) => TABLE_LABELS[t.toLowerCase()] ?? t).join(', ')}`}
            </em>
            <button
              onClick={() => setShowReasoning((v) => !v)}
              className="flex items-center gap-0.5 hover:text-gray-600 transition-colors"
              title={showReasoning ? 'Ocultar raciocínio' : 'Ver raciocínio'}
            >
              <svg
                className={`w-3.5 h-3.5 transition-transform duration-150 ${showReasoning ? 'rotate-180' : ''}`}
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
          <div className="mt-2 bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs">
            {metabaseParts.map((p, i) => {
              const toolName = p.type.slice(5)
              const input = p.input as Record<string, unknown>
              return (
                <div
                  key={(p.toolCallId as string) ?? i}
                  className={i > 0 ? 'mt-3 pt-3 border-t border-gray-200' : ''}
                >
                  {toolName === 'metabase_run_sql' && (
                    <>
                      <div className="text-gray-500 font-medium mb-1">SQL executado:</div>
                      <pre className="bg-white border border-gray-200 rounded p-2 overflow-x-auto text-gray-700 whitespace-pre-wrap break-words font-mono text-[11px]">
                        {String(input.sql ?? '').trim()}
                      </pre>
                    </>
                  )}
                  {toolName === 'metabase_run_card' && (
                    <div className="text-gray-500">
                      Relatório Metabase <strong>#{String(input.card_id ?? '')}</strong>
                    </div>
                  )}
                  {toolName === 'metabase_search_cards' && (
                    <div className="text-gray-500">
                      Busca no Metabase: <em>&ldquo;{String(input.query ?? '')}&rdquo;</em>
                    </div>
                  )}
                  {toolName === 'metabase_explore_schema' && (
                    <div className="text-gray-500">
                      Schema explorado:{' '}
                      <strong>{String(input.table_name ?? input.schema_name ?? 'public')}</strong>
                    </div>
                  )}
                  {toolName === 'nekt_query' && (
                    <div className="text-gray-500">
                      Consulta Nekt:{' '}
                      <em>&ldquo;{String(input.question ?? '')}&rdquo;</em>
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
    .replace(/`(.+?)`/g, '<code class="bg-gray-100 px-1 rounded text-xs">$1</code>')
    .replace(/^### (.+)$/gm, '<h3 class="font-semibold text-sm mt-3 mb-1">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="font-semibold mt-3 mb-1">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="font-bold mt-3 mb-1">$1</h1>')
    .replace(/^\- (.+)$/gm, '<li class="ml-4 list-disc">$1</li>')
    .replace(/^(\d+)\. (.+)$/gm, '<li class="ml-4 list-decimal">$2</li>')
    .replace(/\[(.+?)\]\((.+?)\)/g, (_, text, url) =>
      url.startsWith('http://') || url.startsWith('https://')
        ? `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-[#003366] underline">${text}</a>`
        : text
    )
    .replace(/\n{2,}/g, '</p><p class="mt-2">')
    .replace(/\n/g, '<br/>')
}
