'use client'

interface IngestedDoc {
  title: string
  section: string
  file_path: string
  chunks_count: number
}

interface ErrorItem {
  name: string
  error: string
}

interface Props {
  loading: boolean
  phase?: string
  results: IngestedDoc[]
  errors: ErrorItem[]
}

export function ProcessStatus({ loading, phase, results, errors }: Props) {
  if (!loading && results.length === 0 && errors.length === 0) return null

  return (
    <div className="space-y-3">
      {loading && (
        <div className="flex items-center gap-3 text-sm text-[#003366] bg-blue-50 rounded-xl px-4 py-3">
          <svg className="w-4 h-4 animate-spin flex-shrink-0" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
          <span>{phase ?? 'Processando...'}</span>
        </div>
      )}

      {results.map((doc, i) => (
        <div key={i} className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-green-600">✓</span>
            <span className="font-medium text-green-800 truncate">{doc.title}</span>
          </div>
          <div className="text-green-700 text-xs pl-5">
            Seção: <code className="bg-green-100 px-1 rounded">{doc.section}</code>
            {' · '}
            {doc.chunks_count} chunk{doc.chunks_count !== 1 ? 's' : ''} indexados
          </div>
        </div>
      ))}

      {errors.map((err, i) => (
        <div key={i} className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-red-500">✕</span>
            <span className="font-medium text-red-800 truncate">{err.name}</span>
          </div>
          <div className="text-red-600 text-xs pl-5">{err.error}</div>
        </div>
      ))}
    </div>
  )
}
