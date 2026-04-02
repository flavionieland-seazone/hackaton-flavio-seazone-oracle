-- Seazone Oracle — Schema
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Documentos: 1 por arquivo .md
CREATE TABLE oracle_documents (
  id              BIGSERIAL PRIMARY KEY,
  file_path       TEXT UNIQUE NOT NULL,
  title           TEXT NOT NULL,
  doc_type        TEXT,
  bu              TEXT,
  fonte           TEXT,
  fonte_url       TEXT,
  confianca       TEXT DEFAULT 'alta',
  tags            TEXT[],
  status          TEXT DEFAULT 'ativo',
  parte           INTEGER,
  total_partes    INTEGER,
  relacionados    TEXT[],
  section         TEXT NOT NULL,
  raw_content     TEXT NOT NULL,
  content_hash    TEXT NOT NULL,
  ingested_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_oracle_docs_section ON oracle_documents(section);
CREATE INDEX idx_oracle_docs_bu      ON oracle_documents(bu);
CREATE INDEX idx_oracle_docs_tags    ON oracle_documents USING GIN(tags);

-- Chunks com embeddings (Gemini embedding-001 = 768 dims)
CREATE TABLE oracle_chunks (
  id              BIGSERIAL PRIMARY KEY,
  document_id     BIGINT NOT NULL REFERENCES oracle_documents(id) ON DELETE CASCADE,
  chunk_index     INTEGER NOT NULL,
  content         TEXT NOT NULL,
  heading_path    TEXT,
  token_count     INTEGER,
  embedding       VECTOR(768) NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(document_id, chunk_index)
);

CREATE INDEX ON oracle_chunks USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- Conversas
CREATE TABLE oracle_conversations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source          TEXT NOT NULL DEFAULT 'web',
  slack_channel   TEXT,
  slack_thread_ts TEXT,
  user_id         TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Mensagens
CREATE TABLE oracle_messages (
  id              BIGSERIAL PRIMARY KEY,
  conversation_id UUID REFERENCES oracle_conversations(id) ON DELETE CASCADE,
  role            TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content         TEXT NOT NULL,
  chunk_ids       BIGINT[],
  model           TEXT,
  tokens_input    INTEGER,
  tokens_output   INTEGER,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_oracle_messages_conv ON oracle_messages(conversation_id, created_at);

-- Feedback (thumbs up/down)
CREATE TABLE oracle_feedback (
  id              BIGSERIAL PRIMARY KEY,
  message_id      BIGINT REFERENCES oracle_messages(id) ON DELETE CASCADE,
  rating          SMALLINT CHECK (rating IN (-1, 1)),
  correction      TEXT,
  user_id         TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Self-feeding: perguntas sem resposta
CREATE TABLE oracle_pending_questions (
  id              BIGSERIAL PRIMARY KEY,
  question        TEXT NOT NULL,
  context         TEXT,
  conversation_id UUID REFERENCES oracle_conversations(id),
  source          TEXT DEFAULT 'web',
  status          TEXT DEFAULT 'pending'
                  CHECK (status IN ('pending','answered','rejected','ingested')),
  answer          TEXT,
  answered_by     TEXT,
  target_section  TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  resolved_at     TIMESTAMPTZ
);

CREATE INDEX idx_oracle_pending_status ON oracle_pending_questions(status);

-- RPC: busca semântica com filtros opcionais
CREATE OR REPLACE FUNCTION oracle_search(
  query_embedding  TEXT,
  match_threshold  FLOAT   DEFAULT 0.3,
  match_count      INT     DEFAULT 10,
  filter_bu        TEXT    DEFAULT NULL,
  filter_section   TEXT    DEFAULT NULL
)
RETURNS TABLE (
  chunk_id      BIGINT,
  document_id   BIGINT,
  content       TEXT,
  heading_path  TEXT,
  file_path     TEXT,
  title         TEXT,
  doc_type      TEXT,
  bu            TEXT,
  fonte_url     TEXT,
  confianca     TEXT,
  tags          TEXT[],
  similarity    FLOAT
)
LANGUAGE plpgsql AS $$
DECLARE
  query_vec VECTOR(768);
BEGIN
  query_vec := query_embedding::vector(768);
  RETURN QUERY
  SELECT
    c.id,
    c.document_id,
    c.content,
    c.heading_path,
    d.file_path,
    d.title,
    d.doc_type,
    d.bu,
    d.fonte_url,
    d.confianca,
    d.tags,
    1 - (c.embedding <=> query_vec) AS similarity
  FROM oracle_chunks c
  JOIN oracle_documents d ON d.id = c.document_id
  WHERE 1 - (c.embedding <=> query_vec) > match_threshold
    AND (filter_bu      IS NULL OR d.bu      = filter_bu)
    AND (filter_section IS NULL OR d.section = filter_section)
  ORDER BY c.embedding <=> query_vec
  LIMIT match_count;
END;
$$;
