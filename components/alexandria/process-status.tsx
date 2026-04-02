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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {loading && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.75rem',
          fontSize: '0.875rem', color: 'rgba(245,210,130,0.85)',
          background: 'rgba(120,80,0,0.2)',
          border: '1px solid rgba(200,150,0,0.25)',
          borderRadius: '0.75rem',
          padding: '0.75rem 1rem',
        }}>
          <svg style={{ width: '1rem', height: '1rem', animation: 'spin 1s linear infinite', flexShrink: 0, color: 'rgba(220,160,0,0.8)' }} fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
          <span>{phase ?? 'Processando...'}</span>
        </div>
      )}

      {results.map((doc, i) => (
        <div key={i} style={{
          background: 'rgba(0,60,20,0.25)',
          border: '1px solid rgba(0,180,80,0.25)',
          borderRadius: '0.75rem',
          padding: '0.75rem 1rem',
          fontSize: '0.875rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <span style={{ color: 'rgba(100,220,120,0.9)' }}>✓</span>
            <span style={{ fontWeight: 500, color: 'rgba(160,240,180,0.9)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.title}</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'rgba(120,200,140,0.7)', paddingLeft: '1.25rem' }}>
            Seção: <code style={{ background: 'rgba(0,80,30,0.4)', padding: '0 0.25rem', borderRadius: '0.25rem', fontSize: '0.7rem' }}>{doc.section}</code>
            {' · '}
            {doc.chunks_count} chunk{doc.chunks_count !== 1 ? 's' : ''} indexados
          </div>
        </div>
      ))}

      {errors.map((err, i) => (
        <div key={i} style={{
          background: 'rgba(80,0,0,0.25)',
          border: '1px solid rgba(200,50,50,0.25)',
          borderRadius: '0.75rem',
          padding: '0.75rem 1rem',
          fontSize: '0.875rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <span style={{ color: 'rgba(220,80,80,0.9)' }}>✕</span>
            <span style={{ fontWeight: 500, color: 'rgba(240,130,130,0.9)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{err.name}</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'rgba(220,120,120,0.7)', paddingLeft: '1.25rem' }}>{err.error}</div>
        </div>
      ))}
    </div>
  )
}
