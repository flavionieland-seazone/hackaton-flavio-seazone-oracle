import { supabase } from '@/lib/supabase'
import { parseDocument, chunkDocument } from '@/lib/chunker'
import { embedDocuments } from '@/lib/embeddings'
import { extractText } from '@/lib/alexandria/extract'
import { processWithToth } from '@/lib/alexandria/toth'

export const runtime = 'nodejs'
export const maxDuration = 120

interface IngestedDoc {
  title: string
  section: string
  file_path: string
  chunks_count: number
}

async function processItem(
  buffer: Buffer,
  filename: string,
  mimeType: string,
  notes?: string
): Promise<IngestedDoc> {
  // 1. Extrai texto
  const rawText = await extractText(buffer, filename, mimeType)

  if (!rawText.trim()) {
    throw new Error(`Não foi possível extrair texto de "${filename}"`)
  }

  // 2. Toth gera o .md formatado
  const { markdown, section, slug, title } = await processWithToth({
    rawText,
    fileName: filename,
    userNotes: notes,
  })

  const filePath = `${section}/${slug}.md`

  // 3. Parse + chunk
  const parsed = parseDocument(markdown, filePath)
  const chunks = chunkDocument(parsed)
  const texts = chunks.map((c) => c.content)

  // 4. Embeddings
  const embeddings = await embedDocuments(texts)

  // 5. Upsert documento
  const { data: doc, error: docError } = await supabase
    .from('oracle_documents')
    .upsert(
      {
        file_path: filePath,
        title,
        doc_type: parsed.frontmatter.type ?? 'referencia',
        section,
        confianca: 'media',
        fonte: 'upload-alexandria',
        status: 'ativo',
        raw_content: markdown,
        content_hash: Buffer.from(markdown).toString('base64').slice(0, 64),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'file_path' }
    )
    .select('id')
    .single()

  if (docError || !doc) {
    throw new Error(docError?.message ?? 'Erro ao salvar documento')
  }

  // 6. Substitui chunks
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
    throw new Error(chunksError.message)
  }

  return { title, section, file_path: filePath, chunks_count: chunks.length }
}

export async function POST(request: Request): Promise<Response> {
  const formData = await request.formData()

  const notes = formData.get('notes')?.toString()
  const freeText = formData.get('text')?.toString()
  const files = formData.getAll('files') as File[]

  const results: IngestedDoc[] = []
  const errors: { name: string; error: string }[] = []

  // Processa texto livre como arquivo virtual
  if (freeText?.trim()) {
    try {
      const buffer = Buffer.from(freeText, 'utf-8')
      const doc = await processItem(buffer, 'texto-livre.txt', 'text/plain', notes)
      results.push(doc)
    } catch (err) {
      errors.push({ name: 'texto-livre', error: String(err) })
    }
  }

  // Processa arquivos sequencialmente
  for (const file of files) {
    try {
      const buffer = Buffer.from(await file.arrayBuffer())
      const doc = await processItem(buffer, file.name, file.type, notes)
      results.push(doc)
    } catch (err) {
      errors.push({ name: file.name, error: String(err) })
    }
  }

  if (results.length === 0 && errors.length > 0) {
    return Response.json({ success: false, errors }, { status: 422 })
  }

  return Response.json({ success: true, documents: results, errors })
}
