import { supabase } from './supabase'
import { embedQuery } from './embeddings'
import { MATCH_COUNT, MATCH_THRESHOLD, SYSTEM_PROMPT } from './constants'
import type { OracleChunkResult, SourceCitation } from '@/types'

export async function retrieve(
  query: string,
  filters?: { bu?: string; section?: string }
): Promise<OracleChunkResult[]> {
  const embedding = await embedQuery(query)

  const { data, error } = await supabase.rpc('oracle_search', {
    query_embedding: `[${embedding.join(',')}]`,
    match_threshold: MATCH_THRESHOLD,
    match_count: MATCH_COUNT,
    filter_bu: filters?.bu ?? null,
    filter_section: filters?.section ?? null,
  })

  if (error) {
    console.error('Erro na busca vetorial:', error)
    return []
  }

  return (data as OracleChunkResult[]) ?? []
}

export function buildContext(chunks: OracleChunkResult[]): string {
  if (chunks.length === 0) return 'Nenhum contexto relevante encontrado na base de conhecimento.'

  // Deduplica por documento (mantém maior similaridade)
  const byDoc = new Map<number, OracleChunkResult>()
  for (const chunk of chunks) {
    const existing = byDoc.get(chunk.document_id)
    if (!existing || chunk.similarity > existing.similarity) {
      byDoc.set(chunk.document_id, chunk)
    }
  }

  return Array.from(byDoc.values())
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 6)
    .map(
      (chunk, i) => `### Fonte ${i + 1}: ${chunk.title}
Confiança: ${chunk.confianca}${chunk.fonte_url ? `\nURL externa: ${chunk.fonte_url}` : '\n(sem URL externa — não inventar link)'}
Relevância: ${(chunk.similarity * 100).toFixed(0)}%

${chunk.content}`
    )
    .join('\n\n---\n\n')
}

export function buildSystemPrompt(context: string): string {
  return `${SYSTEM_PROMPT}

---

## CONTEXTO DA BASE DE CONHECIMENTO:

${context}`
}

export function extractSources(chunks: OracleChunkResult[]): SourceCitation[] {
  const byDoc = new Map<number, OracleChunkResult>()
  for (const chunk of chunks) {
    const existing = byDoc.get(chunk.document_id)
    if (!existing || chunk.similarity > existing.similarity) {
      byDoc.set(chunk.document_id, chunk)
    }
  }

  return Array.from(byDoc.values())
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 6)
    .map((chunk) => ({
      title: chunk.title,
      file_path: chunk.file_path,
      fonte_url: chunk.fonte_url,
      confianca: chunk.confianca,
      similarity: chunk.similarity,
      snippet: chunk.content.slice(0, 200) + '...',
    }))
}
