import { createClient } from '@supabase/supabase-js'
import { embedMany } from 'ai'
import { google } from '@ai-sdk/google'
import AdmZip from 'adm-zip'
import { glob } from 'glob'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { config } from 'dotenv'
import { parseDocument, chunkDocument } from '../lib/chunker'

config({ path: path.join(process.cwd(), '.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const EMBEDDING_DIMENSIONS = 768
const BATCH_SIZE = 50
const DELAY_MS = 600

const docModel = google.embeddingModel('gemini-embedding-001')

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

function sha256(content: string) {
  return crypto.createHash('sha256').update(content).digest('hex')
}

async function batchEmbed(texts: string[]): Promise<number[][]> {
  const results: number[][] = []
  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE)
    process.stdout.write(`  Embedding batch ${Math.ceil(i / BATCH_SIZE) + 1}/${Math.ceil(texts.length / BATCH_SIZE)}...`)
    const { embeddings } = await embedMany({
      model: docModel,
      values: batch,
      providerOptions: { google: { taskType: 'RETRIEVAL_DOCUMENT', outputDimensionality: EMBEDDING_DIMENSIONS } },
    })
    results.push(...embeddings)
    process.stdout.write(' ✓\n')
    if (i + BATCH_SIZE < texts.length) await sleep(DELAY_MS)
  }
  return results
}

async function ingestDirectory(dir: string) {
  const files = await glob('**/*.md', { cwd: dir, ignore: ['**/__MACOSX/**', '**/.git/**', '**/.claude/**'] })
  console.log(`\n📁 ${files.length} arquivos .md encontrados\n`)

  let docsCreated = 0
  let docsSkipped = 0
  let chunksTotal = 0
  let chunkTexts: string[] = []
  let chunkMeta: Array<{ docId: number; chunkIndex: number; headingPath: string; tokenCount: number }> = []
  let docIds: number[] = []

  // Processa todos os docs, coleta chunks
  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    const fullPath = path.join(dir, file)
    const rawContent = fs.readFileSync(fullPath, 'utf-8')
    const hash = sha256(rawContent)

    // Pula arquivos inativos ou meta
    const isMetaFile = ['INDEX.md', 'CLAUDE.md', 'SKILL.md', 'README.md'].some(f => file.endsWith(f))
    if (isMetaFile) { docsSkipped++; continue }

    const parsed = parseDocument(rawContent, file)
    if (parsed.frontmatter.status === 'inativo') { docsSkipped++; continue }

    // Upsert documento
    const docData = {
      file_path: file,
      title: parsed.title,
      doc_type: (parsed.frontmatter.type as string) ?? null,
      bu: (parsed.frontmatter.bu as string) ?? null,
      fonte: (parsed.frontmatter.fonte as string) ?? null,
      fonte_url: (parsed.frontmatter.fonte_url as string) ?? null,
      confianca: (parsed.frontmatter.confianca as string) ?? 'alta',
      tags: Array.isArray(parsed.frontmatter.tags) ? parsed.frontmatter.tags : null,
      status: (parsed.frontmatter.status as string) ?? 'ativo',
      parte: (parsed.frontmatter.parte as number) ?? null,
      total_partes: (parsed.frontmatter.total_partes as number) ?? null,
      relacionados: Array.isArray(parsed.frontmatter.relacionados) ? parsed.frontmatter.relacionados : null,
      section: parsed.section,
      raw_content: rawContent,
      content_hash: hash,
      updated_at: new Date().toISOString(),
    }

    const { data: doc, error } = await supabase
      .from('oracle_documents')
      .upsert(docData, { onConflict: 'file_path' })
      .select('id, content_hash')
      .single()

    if (error || !doc) { console.error(`  ❌ Erro no doc ${file}:`, error?.message); continue }

    // Gera chunks
    const chunks = chunkDocument(parsed)
    for (const chunk of chunks) {
      chunkTexts.push(chunk.content)
      chunkMeta.push({ docId: doc.id, chunkIndex: chunk.chunkIndex, headingPath: chunk.headingPath, tokenCount: chunk.tokenCount })
    }
    docIds.push(doc.id)
    docsCreated++

    process.stdout.write(`\r  [${i + 1}/${files.length}] Documentos processados...`)
  }

  console.log(`\n\n📊 ${docsCreated} docs | ${docsSkipped} pulados | ${chunkTexts.length} chunks para embedar\n`)

  if (chunkTexts.length === 0) { console.log('Nada para embedar.'); return }

  // Embeda todos os chunks
  console.log('🔢 Gerando embeddings...')
  const embeddings = await batchEmbed(chunkTexts)

  // Deleta chunks antigos e insere novos
  console.log('\n💾 Salvando chunks no Supabase...')
  const uniqueDocIds = [...new Set(docIds)]
  for (const docId of uniqueDocIds) {
    await supabase.from('oracle_chunks').delete().eq('document_id', docId)
  }

  const rows = chunkMeta.map((meta, i) => ({
    document_id: meta.docId,
    chunk_index: meta.chunkIndex,
    content: chunkTexts[i],
    heading_path: meta.headingPath,
    token_count: meta.tokenCount,
    embedding: embeddings[i],
  }))

  // Insere em batches de 100
  for (let i = 0; i < rows.length; i += 100) {
    const batch = rows.slice(i, i + 100)
    const { error } = await supabase.from('oracle_chunks').insert(batch)
    if (error) console.error('  ❌ Erro ao inserir chunks:', error.message)
    else chunksTotal += batch.length
  }

  console.log(`\n✨ Ingestão concluída: ${docsCreated} docs, ${chunksTotal} chunks indexados`)
}

async function main() {
  console.log('🔍 Seazone Oracle — Pipeline de Ingestão\n')

  const zipPath = process.argv[2] || '/mnt/c/Users/flavi/Downloads/seazone-knowledge-base.zip'
  const extractDir = path.join(process.cwd(), 'knowledge-base')

  if (zipPath.endsWith('.zip') && fs.existsSync(zipPath)) {
    console.log(`📦 Extraindo ${path.basename(zipPath)}...`)
    const zip = new AdmZip(zipPath)
    zip.extractAllTo(extractDir, true)
    console.log(`✅ Extraído em ${extractDir}`)
    const kbDir = path.join(extractDir, 'seazone-knowledge-base')
    await ingestDirectory(fs.existsSync(kbDir) ? kbDir : extractDir)
  } else if (fs.existsSync(zipPath)) {
    await ingestDirectory(zipPath)
  } else {
    console.error('❌ Caminho não encontrado:', zipPath)
    process.exit(1)
  }
}

main().catch(console.error)
