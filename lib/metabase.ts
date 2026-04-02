import { tool } from 'ai'
import { z } from 'zod'
import { SCHEMA_CATALOG } from './schema-catalog'

const METABASE_URL = process.env.METABASE_URL!
const METABASE_API_KEY = process.env.METABASE_API_KEY!

// Colunas sensíveis — palavras exatas, não substrings (ex: "remuneracao" não deve bloquear "reservation")
const SENSITIVE_COL = /\b(salario|remuneracao|salario_base|salario_bruto|cpf|senha|password|secret|api_key|token_acesso)\b/i

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
  error?: string
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
  if (result.error) return `Erro na consulta: ${result.error}`

  const { cols, rows } = result.data
  if (!cols || !rows) return `${label}: resposta sem dados.`

  const total = result.data.rows_truncated ?? rows.length

  // Filtra apenas colunas com nomes explicitamente sensíveis
  const safeIndexes = cols
    .map((c, i) => ({ i, name: c.display_name || c.name }))
    .filter(({ name }) => !SENSITIVE_COL.test(name))

  if (safeIndexes.length === 0) return `${label}: todas as colunas foram filtradas por conter dados sensíveis.`

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
    'Busca relatórios/perguntas salvas no Metabase por palavra-chave. Use para descobrir quais relatórios existem sobre um tema.',
  inputSchema: z.object({
    query: z.string().describe('Termo de busca (ex: "reservas", "receita", "ocupação", "imóvel")'),
  }),
  execute: async ({ query }) => {
    try {
      if (!cardsCache || Date.now() - cardsCache.at > CACHE_TTL) {
        const raw = (await metabaseFetch('/card?f=all')) as { data?: MetabaseCard[] } | MetabaseCard[]
        const cards = Array.isArray(raw) ? raw : (raw.data ?? [])
        cardsCache = { data: cards, at: Date.now() }
      }

      const words = query.toLowerCase().split(/\s+/).filter((w) => w.length > 2)
      const matches = cardsCache.data
        .filter((c) => {
          const text = `${c.name} ${c.description ?? ''}`.toLowerCase()
          return words.some((w) => text.includes(w))
        })
        .sort((a, b) => {
          const scoreA = words.filter((w) => `${a.name} ${a.description ?? ''}`.toLowerCase().includes(w)).length
          const scoreB = words.filter((w) => `${b.name} ${b.description ?? ''}`.toLowerCase().includes(w)).length
          return scoreB - scoreA
        })
        .slice(0, 20)
        .map((c) => ({ id: c.id, name: c.name, description: c.description ?? '' }))

      if (matches.length === 0)
        return `Nenhum relatório encontrado para "${query}". Use metabase_explore_schema para ver as tabelas disponíveis e depois metabase_run_sql.`

      return (
        `Encontrei ${matches.length} relatório(s) sobre "${query}":\n\n` +
        matches.map((c) => `- **ID ${c.id}**: ${c.name}${c.description ? ` — ${c.description}` : ''}`).join('\n')
      )
    } catch (err) {
      return `Erro ao buscar no Metabase: ${err instanceof Error ? err.message : 'erro desconhecido'}`
    }
  },
})

// ─── Tool 2: Executar pergunta salva ──────────────────────────────────────────
export const metabaseRunCard = tool({
  description: 'Executa um relatório salvo no Metabase pelo ID. Retorna os dados em formato de tabela.',
  inputSchema: z.object({
    card_id: z.number().describe('ID do relatório obtido via metabase_search_cards'),
  }),
  execute: async ({ card_id }) => {
    try {
      const result = (await metabaseFetch(`/card/${card_id}/query`, { method: 'POST' })) as MetabaseResult
      return formatResult(result, `Relatório #${card_id}`)
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError')
        return 'Consulta excedeu 15s. Tente uma pergunta mais específica.'
      return `Erro ao executar relatório #${card_id}: ${err instanceof Error ? err.message : 'erro desconhecido'}`
    }
  },
})

// ─── Tool 3: Explorar schema do banco ─────────────────────────────────────────
export const metabaseExploreSchema = tool({
  description:
    'Lista tabelas ou colunas de um banco via Metabase. Use antes de escrever SQL quando não souber a estrutura exata. ' +
    'Bancos: 2=sapron (principal, schemas: "public" com 218 tabelas e "szi" com 11 tabelas do SpotMatch). ' +
    'Para ver tabelas do schema szi: use schema_name="szi". Para colunas de tabela szi: use table_name="szi.spot_buildings".',
  inputSchema: z.object({
    database_id: z.number().optional().describe('ID do banco (padrão: 2=sapron)'),
    table_name: z
      .string()
      .optional()
      .describe(
        'Nome da tabela para listar colunas. Para tabelas do schema szi, use formato "szi.nome_tabela" (ex: "szi.spot_buildings").'
      ),
    schema_name: z
      .string()
      .optional()
      .describe('Nome do schema (padrão: "public"). Use "szi" para tabelas do Seazone Investimentos/SpotMatch.'),
  }),
  execute: async ({ database_id = 2, table_name, schema_name }) => {
    try {
      let sql: string
      let label: string

      if (table_name) {
        // Suporta "szi.spot_buildings" ou simplesmente "spot_buildings" com schema_name="szi"
        const clean = table_name.replace(/'/g, '')
        const parts = clean.split('.')
        const tbl = parts.length > 1 ? parts[1] : parts[0]
        const sch = parts.length > 1 ? parts[0] : (schema_name ?? 'public')
        sql = `SELECT column_name, data_type FROM information_schema.columns WHERE table_schema='${sch}' AND table_name='${tbl}' ORDER BY ordinal_position`
        label = `Colunas de ${sch}.${tbl}`
      } else {
        const sch = schema_name ?? 'public'
        sql = `SELECT table_name FROM information_schema.tables WHERE table_schema='${sch}' ORDER BY table_name`
        label = `Tabelas do schema ${sch} (banco ${database_id})`
      }

      const result = (await metabaseFetch('/dataset', {
        method: 'POST',
        body: JSON.stringify({ database: database_id, type: 'native', native: { query: sql } }),
      })) as MetabaseResult

      return formatResult(result, label)
    } catch (err) {
      return `Erro ao explorar schema: ${err instanceof Error ? err.message : 'erro desconhecido'}`
    }
  },
})

// ─── Tool 4: Executar SQL direto ──────────────────────────────────────────────
export const metabaseRunSql = tool({
  description: `Executa SQL diretamente no data warehouse via Metabase (PostgreSQL).\n${SCHEMA_CATALOG}`,
  inputSchema: z.object({
    sql: z.string().describe('Query SQL PostgreSQL válida'),
    database_id: z
      .number()
      .optional()
      .describe(
        'ID do banco: 2=sapron (padrão, PostgreSQL, schemas: public + szi), 5=site-reservas, 8=SZI (MySQL), 9=data-resources'
      ),
  }),
  execute: async ({ sql, database_id = 2 }) => {
    try {
      // Garante que filtros de "últimos N dias/meses" usem comparação de datas sem fuso
      // e não incluam reservas futuras. Normaliza:
      //   alias.check_in_date >= NOW() - INTERVAL 'X'
      // para:
      //   DATE(alias.check_in_date) >= CURRENT_DATE - INTERVAL 'X' AND DATE(alias.check_in_date) <= CURRENT_DATE
      const fixedSql = sql.replace(
        /((?:\w+\.)?check_in_date)\s*>=\s*(?:NOW\s*\(\s*\)|CURRENT_DATE|CURRENT_TIMESTAMP)\s*(-\s*INTERVAL\s*'[^']+')(?!\s*AND\s*(?:\w+\.)?check_in_date\s*<=)/gi,
        (match, col, interval) => {
          return `DATE(${col}) >= CURRENT_DATE ${interval} AND DATE(${col}) <= CURRENT_DATE`
        }
      )

      const result = (await metabaseFetch('/dataset', {
        method: 'POST',
        body: JSON.stringify({ database: database_id, type: 'native', native: { query: fixedSql } }),
      })) as MetabaseResult

      return formatResult(result, 'Resultado SQL')
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError')
        return 'Query SQL excedeu 15s. Simplifique ou adicione LIMIT.'
      return `Erro ao executar SQL: ${err instanceof Error ? err.message : 'erro desconhecido'}`
    }
  },
})
