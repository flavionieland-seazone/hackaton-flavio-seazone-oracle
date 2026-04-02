import { embed, embedMany } from 'ai'
import { google } from '@ai-sdk/google'
import { EMBEDDING_MODEL, EMBEDDING_DIMENSIONS } from './constants'

const model = google.embeddingModel(EMBEDDING_MODEL)

const BATCH_SIZE = 50
const DELAY_MS = 500

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

export async function embedDocuments(texts: string[]): Promise<number[][]> {
  const results: number[][] = []

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE)
    const { embeddings } = await embedMany({
      model,
      values: batch,
      providerOptions: {
        google: {
          taskType: 'RETRIEVAL_DOCUMENT',
          outputDimensionality: EMBEDDING_DIMENSIONS,
        },
      },
    })
    results.push(...embeddings)

    if (i + BATCH_SIZE < texts.length) {
      await sleep(DELAY_MS)
    }
  }

  return results
}

export async function embedQuery(query: string): Promise<number[]> {
  const { embedding } = await embed({
    model,
    value: query,
    providerOptions: {
      google: {
        taskType: 'RETRIEVAL_QUERY',
        outputDimensionality: EMBEDDING_DIMENSIONS,
      },
    },
  })
  return embedding
}
