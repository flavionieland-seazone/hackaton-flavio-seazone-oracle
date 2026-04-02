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

// ─── Table hints: guide generate_sql to the right table ──────────────────────

const TABLE_HINTS: Array<{ pattern: RegExp; hint: string }> = [
  {
    pattern: /\b(funcionários?\s+ativos?|headcount|colaboradores?\s+ativos?|quantos\s+funcionários?|total\s+de\s+funcionários?)\b/i,
    hint: 'Use a tabela "nekt_silver"."convenia_employee_details_scd2_normalizado" com filtro WHERE status = \'active\' AND _deleted = false AND _available_until IS NULL para funcionários ativos no momento atual.',
  },
  {
    pattern: /\b(histórico\s+de\s+colaborad|carreira|nível|plano\s+de\s+carreira|salário|remuner)\b/i,
    hint: 'Use a tabela "nekt_silver"."people_colaboradores" que contém histórico de colaboradores com dados de carreira, hierarquia e remuneração.',
  },
  {
    pattern: /\b(comiss[aã]o|pontos|multiplicador|indicaç|premiação)\b/i,
    hint: 'Use a tabela "nekt_silver"."comissionamento_pontos_indicacoes" para comissões e pontuação por indicações/vendas dos analistas.',
  },
  {
    pattern: /\b(turnover|churn\s+de\s+pessoas|rotatividade)\b/i,
    hint: 'Use a tabela "nekt_gold"."people_kpis_turnover_churn" para KPIs de turnover e churn de pessoal.',
  },
  {
    pattern: /\b(deal|deals|pipeline|funil\s+de\s+vendas?|leads?\s+pipedrive|negócios?|won|lost)\b/i,
    hint: 'Use a tabela "nekt_service"."pipedrive_deals_marketing_lovable_growth" para deals e pipeline do Pipedrive (status: won/lost/open).',
  },
  {
    pattern: /\b(leads?\s+(entraram|novos|recebidos|criados|essa\s+semana|esse\s+mês|hoje)|total\s+de\s+leads?|quantos\s+leads?)\b/i,
    hint: 'Use a tabela "nekt_service"."pipedrive_deals_marketing_lovable_growth" filtrando pela data de criação (negocio_criado_em).',
  },
  {
    pattern: /\b(ticket|tickets?|atendimento|blip|sla|chamados?|hóspedes?\s+atendid|parceiros?\s+atendid)\b/i,
    hint: 'Use as tabelas "nekt_trusted"."hospedes_blip_tickets_daily_report", "nekt_trusted"."parceiros_blip_tickets_daily_report" ou "nekt_trusted"."servicos_blip_tickets_daily_report" dependendo da fila. Colunas: date, open, closed, closed_attendant, transferred, missed.',
  },
  {
    pattern: /\b(google\s+ads|campanha|campanhas?|cpc|ctr|impressões?|cliques?|conversões?|custo\s+por)\b/i,
    hint: 'Use a tabela "nekt_service"."google_ads_geral_utilizacao" para métricas de campanhas Google Ads. O campo cost já está em R$ decimal.',
  },
  {
    pattern: /\b(kpi|metas?|performance\s+geral|objetivos?)\b/i,
    hint: 'Use as tabelas "nekt_gold"."kpis_{setor}_analise" (ex: kpis_szs_analise, kpis_comercial_vendas_szs_analise) ou "nekt_gold"."kpi_metas_analise" para metas. Estrutura: kpi, titulo, data, valor, setor.',
  },
  {
    pattern: /\b(analistas?|performance\s+d[oe]s?\s+analistas?|ranking\s+de\s+analistas?)\b/i,
    hint: 'Use "nekt_service"."pipedrive_deals_marketing_lovable_growth" (campo proprietario) para performance de analistas comerciais, ou "nekt_gold"."kpis_comercial_vendas_szs_analise" para KPIs calculados.',
  },
]

function addTableHint(question: string): string {
  for (const { pattern, hint } of TABLE_HINTS) {
    if (pattern.test(question)) {
      return `${question}\n\nDica de tabela: ${hint}`
    }
  }
  return question
}

// ─── Tool: nekt_query ─────────────────────────────────────────────────────────

const NEKT_SCHEMA = `
Domínios e tabelas disponíveis na Nekt:

**RH / People**
- Headcount atual: "nekt_silver"."convenia_employee_details_scd2_normalizado" — status='active', _deleted=false, _available_until IS NULL
- Histórico colaboradores: "nekt_silver"."people_colaboradores" — carreira, hierarquia, salário, tipo_contrato, data_admissao
- Comissão/pontos: "nekt_silver"."comissionamento_pontos_indicacoes" — total_pontos, ganho por vertical, por mês
- Turnover: "nekt_gold"."people_kpis_turnover_churn"

**Comercial / Leads / Pipeline**
- Deals Pipedrive: "nekt_service"."pipedrive_deals_marketing_lovable_growth" — status(won/lost/open), pipeline_name, stage_name, negocio_criado_em, canal, regiao
- Deals enriquecido: "nekt_silver"."deals_pipedrive_join_marketing" — acv, score, nivel_corretor
- KPIs vendas: "nekt_gold"."kpis_comercial_vendas_szs_analise", "nekt_gold"."kpis_comercial_vendas_szi_analise"
- KPIs expansão: "nekt_gold"."kpis_comercial_expansao_analise"

**Atendimento (Blip)** — 3 filas: hospedes / parceiros / servicos
- Tickets diários: "nekt_trusted"."hospedes_blip_tickets_daily_report" — date, open, closed, closed_attendant, transferred, missed
- Métricas agente: "nekt_trusted"."hospedes_blip_agent_metrics" — agent_name, opened_tickets, closed_tickets, average_attendance_time

**Marketing / Google Ads**
- Campanhas: "nekt_service"."google_ads_geral_utilizacao" — campaign_name, date, clicks, conversions, cost(R$), ctr, cost_per_conversion
- KPIs marketing: "nekt_gold"."kpis_marketing_analise", "nekt_gold"."kpi_marketing_geral_analise"

**KPIs Gerais (Gold)**
- Estrutura padrão: kpi, titulo, data, valor, setor, formatacao, status, dono
- Tabelas: kpis_szs_analise, kpis_analiticos_szi_monthly, kpi_people_analise_monthly, kpi_metas_analise
- Implantação: "nekt_silver"."imp_kpis_gerais_monthly" — total_imoveis_ativados, churns_solicitados, churns_efetivados
`

export const nektQuery = tool({
  description:
    'Consulta dados da Nekt (data lakehouse da Seazone) usando linguagem natural. ' +
    'Use para perguntas sobre: equipe/funcionários, performance de analistas, metas comerciais, ' +
    'leads e pipeline de vendas (Pipedrive), atendimento ao cliente (Blip/tickets), ' +
    'dados de marketing e campanhas Google Ads, KPIs internos, comissão, turnover. ' +
    'NÃO use para reservas, imóveis ou faturamento de hospedagem — esses dados estão no Metabase.' +
    NEKT_SCHEMA,
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
      // Add table hint to guide generate_sql to the right table
      const questionWithHint = addTableHint(question)

      // Step 1: Generate SQL from natural language
      const sqlRaw = await callTool('generate_sql', { question: questionWithHint })
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
