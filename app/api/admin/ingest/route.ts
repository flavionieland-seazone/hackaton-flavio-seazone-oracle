import { supabase } from '@/lib/supabase'
import { embedMany } from 'ai'
import { google } from '@ai-sdk/google'
import { parseDocument, chunkDocument } from '@/lib/chunker'
import { EMBEDDING_MODEL, EMBEDDING_DIMENSIONS } from '@/lib/constants'

const embeddingModel = google.embeddingModel(EMBEDDING_MODEL)

export async function POST(request: Request) {
  const { pending_id, question, answer, target_section, answered_by } = await request.json()

  if (!answer?.trim() || !target_section || !question) {
    return Response.json({ error: 'answer, question e target_section são obrigatórios' }, { status: 400 })
  }

  // Gera slug a partir da pergunta
  const slug = question
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 60)

  const filePath = `${target_section}/${slug}.md`
  const now = new Date().toISOString().split('T')[0]

  const rawContent = `---
title: "${question.replace(/"/g, "'")}"
type: faq
confianca: alta
fonte: oracle-validated
status: ativo
tags: [faq, oracle-gerado]
---

# ${question}

${answer.trim()}

---
*Validado em ${now}${answered_by ? ` por ${answered_by}` : ''}*
`

  // Parse + chunk
  const parsed = parseDocument(rawContent, filePath)
  const chunks = chunkDocument(parsed)
  const texts = chunks.map((c) => c.content)

  // Gera embeddings
  const { embeddings } = await embedMany({
    model: embeddingModel,
    values: texts,
    providerOptions: {
      google: { taskType: 'RETRIEVAL_DOCUMENT', outputDimensionality: EMBEDDING_DIMENSIONS },
    },
  })

  // Upsert documento
  const { data: doc, error: docError } = await supabase
    .from('oracle_documents')
    .upsert({
      file_path: filePath,
      title: question,
      doc_type: 'faq',
      section: target_section,
      confianca: 'alta',
      fonte: 'oracle-validated',
      status: 'ativo',
      raw_content: rawContent,
      content_hash: Buffer.from(rawContent).toString('base64').slice(0, 64),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'file_path' })
    .select('id')
    .single()

  if (docError || !doc) {
    return Response.json({ error: docError?.message ?? 'Erro ao salvar documento' }, { status: 500 })
  }

  // Deleta chunks antigos e insere novos
  await supabase.from('oracle_chunks').delete().eq('document_id', doc.id)

  const rows = chunks.map((chunk, i) => ({
    document_id: doc.id,
    chunk_index: chunk.chunkIndex,
    content: chunk.content,
    heading_path: chunk.headingPath,
    token_count: chunk.tokenCount,
    embedding: embeddings[i],
  }))

  const { error: chunksError } = await supabase.from('oracle_chunks').insert(rows)
  if (chunksError) {
    return Response.json({ error: chunksError.message }, { status: 500 })
  }

  // Atualiza status da pergunta pendente
  if (pending_id) {
    await supabase
      .from('oracle_pending_questions')
      .update({
        status: 'ingested',
        answer,
        answered_by: answered_by ?? 'admin',
        resolved_at: new Date().toISOString(),
      })
      .eq('id', pending_id)
  }

  return Response.json({ ok: true, file_path: filePath, doc_id: doc.id })
}
