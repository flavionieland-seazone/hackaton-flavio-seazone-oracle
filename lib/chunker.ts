import matter from 'gray-matter'
import { MAX_CHUNK_TOKENS } from './constants'

export interface ParsedDocument {
  frontmatter: Record<string, unknown>
  body: string
  title: string
  section: string
}

export interface DocumentChunk {
  content: string
  headingPath: string
  chunkIndex: number
  tokenCount: number
}

export function parseDocument(rawContent: string, filePath: string): ParsedDocument {
  const { data: frontmatter, content: body } = matter(rawContent)

  const section = filePath.split('/')[0] || 'geral'
  const title = (frontmatter.title as string) || extractTitleFromBody(body) || filePath

  return { frontmatter, body, title, section }
}

function extractTitleFromBody(body: string): string {
  const match = body.match(/^#\s+(.+)$/m)
  return match ? match[1].trim() : ''
}

function estimateTokens(text: string): number {
  // Aproximação: ~4 chars por token
  return Math.ceil(text.length / 4)
}

function splitByHeaders(body: string): Array<{ heading: string; content: string }> {
  const sections: Array<{ heading: string; content: string }> = []
  const lines = body.split('\n')
  let currentHeading = ''
  let currentContent: string[] = []

  for (const line of lines) {
    const match = line.match(/^(#{1,3})\s+(.+)$/)
    if (match) {
      if (currentContent.join('\n').trim()) {
        sections.push({ heading: currentHeading, content: currentContent.join('\n').trim() })
      }
      currentHeading = match[2].trim()
      currentContent = []
    } else {
      currentContent.push(line)
    }
  }

  if (currentContent.join('\n').trim()) {
    sections.push({ heading: currentHeading, content: currentContent.join('\n').trim() })
  }

  return sections
}

export function chunkDocument(parsed: ParsedDocument): DocumentChunk[] {
  const { body, title } = parsed
  const tokens = estimateTokens(body)

  // Maioria dos arquivos < 800 tokens → chunk único
  if (tokens <= MAX_CHUNK_TOKENS) {
    return [
      {
        content: `${title}\n\n${body.trim()}`,
        headingPath: title,
        chunkIndex: 0,
        tokenCount: tokens,
      },
    ]
  }

  // Arquivos maiores → split por headers
  const sections = splitByHeaders(body)
  if (sections.length <= 1) {
    // Sem headers → chunk único mesmo que grande
    return [
      {
        content: `${title}\n\n${body.trim()}`,
        headingPath: title,
        chunkIndex: 0,
        tokenCount: tokens,
      },
    ]
  }

  return sections
    .filter((s) => s.content.trim().length > 50)
    .map((section, i) => ({
      content: `${title}\n\n## ${section.heading}\n\n${section.content}`,
      headingPath: `${title} > ${section.heading}`,
      chunkIndex: i,
      tokenCount: estimateTokens(section.content),
    }))
}
