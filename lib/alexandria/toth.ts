import { generateText } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { CHAT_MODEL } from '@/lib/constants'

const _openrouter = createOpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY!,
})
const tothModel = _openrouter.chat(CHAT_MODEL)

const SECTIONS = [
  { id: '01-institucional', desc: 'Missão, valores, história, cultura, ESG, políticas internas, comunicados gerais' },
  { id: '02-unidades-de-negocio', desc: 'Gestão Completa, Spot, SZI, descrição de serviços e modelos de negócio' },
  { id: '03-empreendimentos', desc: 'Empreendimentos específicos, condomínios, obras, lançamentos' },
  { id: '04-comercial', desc: 'Processos de venda, onboarding de proprietário, contratos de gestão, captação' },
  { id: '05-contratos', desc: 'Modelos de contrato, termos, SLA, aditivos, rescisões' },
  { id: '06-operacao', desc: 'Operações de hospedagem, check-in/out, limpeza, manutenção, OTAs' },
  { id: '07-organizacao', desc: 'Estrutura organizacional, times, cargos, processos internos, RH, benefícios' },
  { id: '08-tech', desc: 'Sistemas internos, integrações, APIs, ferramentas de tecnologia' },
  { id: '09-marketing', desc: 'Campanhas, identidade visual, redes sociais, posicionamento de marca' },
  { id: '10-dados-mercado', desc: 'Dados de mercado, pesquisas, benchmarks, análises externas' },
]

// Prompt that returns ONLY metadata — body is kept separate to avoid JSON escaping issues
const TOTH_META_PROMPT = `Você é o Toth, agente de curadoria de conhecimento da Seazone. Analise o conteúdo fornecido e retorne APENAS um JSON com os metadados do documento.

## SEÇÕES DISPONÍVEIS
${SECTIONS.map((s) => `- **${s.id}**: ${s.desc}`).join('\n')}

## RETORNE EXATAMENTE ESTE JSON (sem markdown fences, sem texto extra):
{
  "title": "<título descritivo em português>",
  "section": "<id da seção>",
  "slug": "<slug kebab-case max 60 chars, só letras minúsculas sem acentos, números e hífens>",
  "type": "referencia | processo | faq | politica | manual",
  "bu": "gestao-completa | spot | szi | corporativo | tech | marketing | comercial",
  "tags": ["tag1", "tag2", "tag3"]
}

Regras:
- type: use "referencia" como default
- bu: escolha o mais adequado ao conteúdo; use "corporativo" para comunicados gerais
- tags: 3-5 palavras-chave relevantes
- Retorne SOMENTE o JSON, nada mais`

export async function processWithToth(input: {
  rawText: string
  fileName: string
  userNotes?: string
}): Promise<{
  markdown: string
  section: string
  slug: string
  title: string
}> {
  const userContent = [
    input.userNotes ? `Contexto: ${input.userNotes}\n\n` : '',
    `Arquivo: ${input.fileName}\n\n`,
    `Conteúdo:\n${input.rawText.slice(0, 12000)}`,
  ].join('')

  const { text } = await generateText({
    model: tothModel,
    system: TOTH_META_PROMPT,
    prompt: userContent,
  })

  // Extract JSON — find outermost { }
  let cleaned = text.replace(/^```(?:json)?\s*/m, '').replace(/\s*```\s*$/m, '').trim()
  const start = cleaned.indexOf('{')
  const end = cleaned.lastIndexOf('}')
  if (start !== -1 && end !== -1) cleaned = cleaned.slice(start, end + 1)
  const meta = JSON.parse(cleaned)

  const title = meta.title as string
  const section = meta.section as string
  const slug = (meta.slug as string).replace(/[^a-z0-9-]/g, '').slice(0, 60)
  const type = meta.type ?? 'referencia'
  const bu = meta.bu ?? 'corporativo'
  const tags = Array.isArray(meta.tags) ? meta.tags.join(', ') : ''

  // Build the complete markdown ourselves — body is the raw text, cleaned up
  const body = input.rawText.slice(0, 12000).replace(/\n{3,}/g, '\n\n').trim()

  const markdown = `---
title: "${title.replace(/"/g, "'")}"
type: ${type}
bu: ${bu}
status: ativo
tags: [${tags}]
confianca: media
fonte: ${input.userNotes?.includes('slack') ? 'slack-digest' : 'upload-alexandria'}
---

# ${title}

${body}
`

  return { markdown, section, slug, title }
}
