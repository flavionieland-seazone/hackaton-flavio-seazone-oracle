import { tool } from 'ai'
import { z } from 'zod'

const NEKT_MCP_URL = process.env.NEKT_MCP_URL!
const NEKT_MCP_TOKEN = process.env.NEKT_MCP_TOKEN!

// ─── MCP Streamable HTTP client ──────────────────────────────────────────────

interface McpResult {
  content?: Array<{ type: string; text?: string }>
  isError?: boolean
}

let sessionId: string | null = null

async function nektFetch(method: string, params: Record<string, unknown>, id = 1): Promise<McpResult | null> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 20000)

  try {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${NEKT_MCP_TOKEN}`,
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
    }
    if (sessionId) headers['mcp-session-id'] = sessionId

    const res = await fetch(NEKT_MCP_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify({ jsonrpc: '2.0', id, method, params }),
      signal: controller.signal,
    })

    // Capture session ID
    const sid = res.headers.get('mcp-session-id')
    if (sid) sessionId = sid

    const text = await res.text()
    for (const line of text.split('\n')) {
      if (!line.startsWith('data: ')) continue
      const obj = JSON.parse(line.slice(6))
      if (obj.result !== undefined) return obj.result as McpResult
      if (obj.error) throw new Error(obj.error.message ?? JSON.stringify(obj.error))
    }
    return null
  } finally {
    clearTimeout(timeout)
  }
}

async function ensureSession(): Promise<void> {
  if (sessionId) return
  const res = await nektFetch('initialize', {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'seazone-oracle', version: '1.0' },
  }, 0)
  if (res) {
    // Send initialized notification (fire-and-forget)
    void nektFetch('notifications/initialized', {}, -1).catch(() => {})
  }
}

async function callTool(name: string, args: Record<string, unknown>): Promise<string> {
  await ensureSession()
  const result = await nektFetch('tools/call', { name, arguments: args })
  if (!result) return 'Sem resultado da Nekt.'
  const texts = (result.content ?? [])
    .filter((c) => c.type === 'text' && c.text)
    .map((c) => c.text!)
  return texts.join('\n') || 'Sem conteúdo retornado.'
}

function formatNektResult(json: string, question: string): string {
  try {
    const data = JSON.parse(json)
    if (data.status === 'failed' || data.error) {
      return `Erro na consulta Nekt: ${data.error ?? data.status}`
    }

    const { columns, data: rows, row_count } = data

    if (!columns || !rows) return json

    if (row_count === 0) return `Nenhum resultado encontrado para: "${question}"`

    // Build markdown table
    const header = `| ${columns.join(' | ')} |`
    const divider = `| ${columns.map(() => '---').join(' | ')} |`
    const displayRows = rows.slice(0, 50)
    const bodyLines = displayRows.map(
      (row: unknown[]) => `| ${row.map((v) => String(v ?? '').slice(0, 100)).join(' | ')} |`
    )

    let table = [header, divider, ...bodyLines].join('\n')
    if (table.length > 8000) table = table.slice(0, 8000) + '\n...(truncado)'
    if (displayRows.length < row_count) {
      table += `\n\n*Mostrando ${displayRows.length} de ${row_count} linhas.*`
    }
    return table
  } catch {
    return json
  }
}

// ─── Tool: nekt_query ─────────────────────────────────────────────────────────
export const nektQuery = tool({
  description:
    'Consulta dados da Nekt (data lakehouse da Seazone) usando linguagem natural. ' +
    'Use para perguntas sobre: equipe/funcionários, performance de analistas, metas comerciais, ' +
    'leads e pipeline de vendas (Pipedrive/Meetime), atendimento ao cliente (Blip/tickets), ' +
    'dados de marketing e campanhas, KPIs internos, processos e tarefas (Run Run It). ' +
    'NÃO use para reservas, imóveis ou faturamento — esses dados estão no Metabase.',
  inputSchema: z.object({
    question: z
      .string()
      .describe(
        'Pergunta em português sobre os dados da Nekt. Ex: "quantos funcionários ativos temos?", ' +
          '"qual a performance dos analistas em março?", "quantos leads entraram essa semana?"'
      ),
  }),
  execute: async ({ question }) => {
    try {
      // Step 1: Generate SQL from natural language
      const sqlRaw = await callTool('generate_sql', { question })
      let sql: string
      let explanation: string = ''

      try {
        const sqlData = JSON.parse(sqlRaw)
        if (!sqlData.is_valid || sqlData.validation_status === 'failed') {
          return `Não foi possível gerar uma query válida para: "${question}". Tente reformular a pergunta.`
        }
        sql = sqlData.sql
        explanation = sqlData.explanation ?? ''
      } catch {
        return `Erro ao interpretar resposta da Nekt: ${sqlRaw.slice(0, 200)}`
      }

      // Step 2: Execute SQL
      const resultRaw = await callTool('execute_sql', { sql_query: sql })
      const formatted = formatNektResult(resultRaw, question)

      // Include brief explanation as context
      const explainNote = explanation ? `\n*${explanation.slice(0, 150)}*` : ''
      return `${formatted}${explainNote}`
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return 'Consulta Nekt excedeu 20s. Tente uma pergunta mais específica.'
      }
      return `Erro ao consultar Nekt: ${err instanceof Error ? err.message : 'erro desconhecido'}`
    }
  },
})
