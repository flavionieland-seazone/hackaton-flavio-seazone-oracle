import { generateText } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { CHAT_MODEL } from '@/lib/constants'

const _openrouter = createOpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY!,
})
const tothModel = _openrouter.chat(CHAT_MODEL)

const SECTIONS = [
  { id: '01-institucional', desc: 'Missão, valores, história, cultura, ESG, políticas internas' },
  { id: '02-unidades-de-negocio', desc: 'Gestão Completa, Spot, SZI, descrição de serviços e modelos de negócio' },
  { id: '03-empreendimentos', desc: 'Empreendimentos específicos, condomínios, obras, lançamentos' },
  { id: '04-comercial', desc: 'Processos de venda, onboarding de proprietário, contratos de gestão, captação' },
  { id: '05-contratos', desc: 'Modelos de contrato, termos, SLA, aditivos, rescisões' },
  { id: '06-operacao', desc: 'Operações de hospedagem, check-in/out, limpeza, manutenção, OTAs' },
  { id: '07-organizacao', desc: 'Estrutura organizacional, times, cargos, processos internos, RH' },
  { id: '08-tech', desc: 'Sistemas internos, integrações, APIs, ferramentas de tecnologia' },
  { id: '09-marketing', desc: 'Campanhas, identidade visual, redes sociais, posicionamento de marca' },
  { id: '10-dados-mercado', desc: 'Dados de mercado, pesquisas, benchmarks, análises externas' },
]

const TOTH_PROMPT = `Você é o Toth, agente de curadoria de conhecimento da Seazone. Seu trabalho é transformar conteúdo bruto em documentos estruturados compatíveis com a base de conhecimento do Oracle.

## SEÇÕES DISPONÍVEIS
${SECTIONS.map((s) => `- **${s.id}**: ${s.desc}`).join('\n')}

## CAMPOS DO FRONTMATTER
Obrigatórios:
- title: título descritivo em português (string)
- type: "referencia" | "processo" | "faq" | "politica" | "manual"
- bu: "gestao-completa" | "spot" | "szi" | "corporativo" | "tech" | "marketing" | "comercial"
- status: "ativo"

Opcionais recomendados:
- tags: lista de palavras-chave relevantes
- confianca: "alta" | "media" | "baixa" — use "media" para conteúdo importado sem validação
- fonte: "upload-alexandria"

## EXEMPLOS DE DOCUMENTOS FORMATADOS

Exemplo 1:
\`\`\`
---
title: "Política de cancelamento de reservas"
type: politica
bu: gestao-completa
status: ativo
tags: [cancelamento, reservas, hospedagem]
confianca: media
fonte: upload-alexandria
---

# Política de Cancelamento de Reservas

## Prazo de Cancelamento
...

## Reembolso
...
\`\`\`

Exemplo 2:
\`\`\`
---
title: "Processo de onboarding de proprietário"
type: processo
bu: comercial
status: ativo
tags: [onboarding, proprietário, captação]
confianca: media
fonte: upload-alexandria
---

# Processo de Onboarding de Proprietário

## Etapa 1 — Visita comercial
...
\`\`\`

## TAREFA
Analise o conteúdo abaixo e retorne um JSON válido (sem markdown code blocks) com esta estrutura exata:
{
  "markdown": "<documento .md completo com frontmatter YAML>",
  "section": "<id da seção>",
  "slug": "<slug kebab-case com max 60 chars para nome do arquivo>",
  "title": "<título do documento>"
}

Regras:
1. O campo "markdown" deve conter o documento .md inteiro: frontmatter delimitado por --- no início e no fim, seguido do body organizado em headings hierárquicos
2. Use type: "referencia" como default se não souber o tipo exato
3. Use confianca: "media" para todo conteúdo importado via upload
4. Use fonte: "upload-alexandria"
5. Organize o body em Markdown limpo — remova artefatos de extração (espaços duplos, quebras de linha excessivas)
6. O slug deve ser kebab-case, apenas letras minúsculas sem acentos, números e hífens`

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
    input.userNotes ? `**Notas do usuário:** ${input.userNotes}\n\n` : '',
    `**Arquivo:** ${input.fileName}\n\n`,
    `**Conteúdo extraído:**\n${input.rawText.slice(0, 12000)}`,
  ].join('')

  const { text } = await generateText({
    model: tothModel,
    system: TOTH_PROMPT,
    prompt: userContent,
  })

  // Parse JSON — strip potential markdown code fences if model adds them
  const cleaned = text.replace(/^```(?:json)?\s*/m, '').replace(/\s*```\s*$/m, '').trim()
  const parsed = JSON.parse(cleaned)

  return {
    markdown: parsed.markdown as string,
    section: parsed.section as string,
    slug: (parsed.slug as string).replace(/[^a-z0-9-]/g, '').slice(0, 60),
    title: parsed.title as string,
  }
}
