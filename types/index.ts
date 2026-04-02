export interface OracleChunkResult {
  chunk_id: number
  document_id: number
  content: string
  heading_path: string | null
  file_path: string
  title: string
  doc_type: string | null
  bu: string | null
  fonte_url: string | null
  confianca: string
  tags: string[] | null
  similarity: number
}

export interface OracleConversation {
  id: string
  source: 'web' | 'slack'
  slack_channel?: string
  slack_thread_ts?: string
  user_id?: string
}

export interface OracleMessage {
  id: number
  conversation_id: string
  role: 'user' | 'assistant'
  content: string
  chunk_ids?: number[]
}

export interface OraclePendingQuestion {
  id: number
  question: string
  context: string | null
  source: string
  status: 'pending' | 'answered' | 'rejected' | 'ingested'
  answer: string | null
  answered_by: string | null
  target_section: string | null
  created_at: string
}

export interface ChatRequest {
  message: string
  conversation_id?: string
  filters?: {
    bu?: string
    section?: string
  }
}

export interface SourceCitation {
  title: string
  file_path: string
  fonte_url: string | null
  confianca: string
  similarity: number
  snippet: string
}
