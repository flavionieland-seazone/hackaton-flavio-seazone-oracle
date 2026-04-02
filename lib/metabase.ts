import { tool } from 'ai'
import { z } from 'zod'

const METABASE_URL = process.env.METABASE_URL!
const METABASE_API_KEY = process.env.METABASE_API_KEY!

// Colunas sensíveis que nunca devem ser retornadas ao modelo
const SENSITIVE_COL = /salari|remuner|cpf|senha|token|secret|password/i

// Cache de cards com TTL de 5 minutos
let cardsCache: { data: MetabaseCard[]; at: number } | null = null
const CACHE_TTL = 5 * 60 * 1000

interface MetabaseCard {
  id: number
  name: string
  description: string | null
  collection_id: number | null
}

interface MetabaseResult {
  data: {
    cols: Array<{ display_name: string; name: string }>
    rows: Array<Array<unknown>>
    rows_truncated?: number
  }
}

async function metabaseFetch(path: string, options?: RequestInit): Promise<unknown> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 15000)

  try {
    const res = await fetch(`${METABASE_URL}/api${path}`, {
      ...options,
      headers: {
        'x-api-key': METABASE_API_KEY,
        'Content-Type': 'application/json',
        ...(options?.headers ?? {}),
      },
      signal: controller.signal,
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`Metabase ${res.status}: ${text.slice(0, 200)}`)
    }

    return res.json()
  } finally {
    clearTimeout(timeout)
  }
}

function formatResult(result: MetabaseResult, label = 'Resultado'): string {
  const { cols, rows } = result.data
  const total = result.data.rows_truncated ?? rows.length

  // Filtra colunas sensíveis
  const safeIndexes = cols
    .map((c, i) => ({ i, name: c.display_name || c.name }))
    .filter(({ name }) => !SENSITIVE_COL.test(name))

  if (safeIndexes.length === 0) return `${label}: dados disponíveis mas contêm apenas colunas sensíveis.`

  const header = `| ${safeIndexes.map((c) => c.name).join(' | ')} |`
  const divider = `| ${safeIndexes.map(() => '---').join(' | ')} |`
  const displayRows = rows.slice(0, 50)
  const bodyLines = displayRows.map(
    (row) => `| ${safeIndexes.map((c) => String(row[c.i] ?? '').slice(0, 100)).join(' | ')} |`
  )

  let table = [header, divider, ...bodyLines].join('\n')
  if (table.length > 8000) table = table.slice(0, 8000) + '\n...(truncado)'
  if (displayRows.length < total)
    table += `\n\n*Mostrando ${displayRows.length} de ${total} linhas.*`

  return table
}

// ─── Tool 1: Buscar saved questions ───────────────────────────────────────────
export const metabaseSearchCards = tool({
  description:
    'Busca perguntas/relatórios salvos no Metabase por palavra-chave. Use PRIMEIRO para descobrir quais dados existem antes de executar uma consulta.',
  inputSchema: z.object({
    query: z.string().describe('Termo de busca (ex: "imóveis", "receita", "ocupação", "funcionários")'),
  }),
  execute: async ({ query }) => {
    try {
      // Usa cache se disponível
      if (!cardsCache || Date.now() - cardsCache.at > CACHE_TTL) {
        const raw = (await metabaseFetch('/card?f=all')) as { data?: MetabaseCard[] } | MetabaseCard[]
        const cards = Array.isArray(raw) ? raw : (raw.data ?? [])
        cardsCache = { data: cards, at: Date.now() }
      }

      // Busca por cada palavra do termo para maior abrangência
      const words = query.toLowerCase().split(/\s+/).filter((w) => w.length > 2)
      const matches = cardsCache.data
        .filter((c) => {
          const text = `${c.name} ${c.description ?? ''}`.toLowerCase()
          return words.some((w) => text.includes(w))
        })
        .sort((a, b) => {
          // Prioriza cards que contêm mais palavras do termo
          const scoreA = words.filter((w) => `${a.name} ${a.description ?? ''}`.toLowerCase().includes(w)).length
          const scoreB = words.filter((w) => `${b.name} ${b.description ?? ''}`.toLowerCase().includes(w)).length
          return scoreB - scoreA
        })
        .slice(0, 20)
        .map((c) => ({ id: c.id, name: c.name, description: c.description ?? '' }))

      if (matches.length === 0)
        return `Nenhuma pergunta salva encontrada para "${query}". Tente outros termos ou use metabase_run_sql.`

      return (
        `Encontrei ${matches.length} pergunta(s) sobre "${query}":\n\n` +
        matches.map((c) => `- **ID ${c.id}**: ${c.name}${c.description ? ` — ${c.description}` : ''}`).join('\n')
      )
    } catch (err) {
      return `Erro ao buscar no Metabase: ${err instanceof Error ? err.message : 'erro desconhecido'}`
    }
  },
})

// ─── Tool 2: Executar pergunta salva ──────────────────────────────────────────
export const metabaseRunCard = tool({
  description:
    'Executa uma pergunta salva no Metabase pelo ID (obtido via metabase_search_cards). Retorna os dados em formato de tabela.',
  inputSchema: z.object({
    card_id: z.number().describe('ID da pergunta salva obtido via metabase_search_cards'),
  }),
  execute: async ({ card_id }) => {
    try {
      const result = (await metabaseFetch(`/card/${card_id}/query`, { method: 'POST' })) as MetabaseResult
      return formatResult(result, `Resultado da pergunta #${card_id}`)
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError')
        return 'A consulta ao Metabase excedeu 15 segundos. Tente uma pergunta mais específica.'
      return `Erro ao executar pergunta #${card_id}: ${err instanceof Error ? err.message : 'erro desconhecido'}`
    }
  },
})

// ─── Tool 3: Executar SQL direto ──────────────────────────────────────────────
export const metabaseRunSql = tool({
  description:
    'Executa SQL diretamente no data warehouse via Metabase. Use apenas quando não houver pergunta salva adequada.',
  inputSchema: z.object({
    sql: z.string().describe('Query SQL a executar'),
    database_id: z.number().optional().describe('ID do banco de dados. Bancos disponíveis: 2=sapron (principal), 5=site-reservas, 8=SZI, 9=data-resources. Padrão: 2'),
  }),
  execute: async ({ sql, database_id = 2 }) => {
    try {
      const result = (await metabaseFetch('/dataset', {
        method: 'POST',
        body: JSON.stringify({
          database: database_id,
          type: 'native',
          native: { query: sql },
        }),
      })) as MetabaseResult

      return formatResult(result, 'Resultado SQL')
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError')
        return 'A query SQL excedeu 15 segundos. Simplifique a consulta.'
      return `Erro ao executar SQL: ${err instanceof Error ? err.message : 'erro desconhecido'}`
    }
  },
})
