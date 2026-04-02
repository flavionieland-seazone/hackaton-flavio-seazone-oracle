'use client'

import { useRef, useState } from 'react'

interface Props {
  onFiles: (files: File[]) => void
  disabled?: boolean
}

export function UploadZone({ onFiles, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [staged, setStaged] = useState<File[]>([])

  function handleFiles(incoming: FileList | null) {
    if (!incoming) return
    const next = Array.from(incoming)
    setStaged((prev) => {
      const merged = [...prev, ...next]
      onFiles(merged)
      return merged
    })
  }

  function removeFile(index: number) {
    setStaged((prev) => {
      const next = prev.filter((_, i) => i !== index)
      onFiles(next)
      return next
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <div
        onClick={() => !disabled && inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          handleFiles(e.dataTransfer.files)
        }}
        style={{
          border: `2px dashed ${dragging ? 'rgba(220,160,0,0.7)' : 'rgba(200,150,0,0.3)'}`,
          borderRadius: '0.75rem',
          padding: '2rem',
          textAlign: 'center',
          cursor: disabled ? 'not-allowed' : 'pointer',
          transition: 'all 0.2s',
          background: dragging ? 'rgba(120,80,0,0.15)' : 'rgba(40,25,0,0.3)',
          opacity: disabled ? 0.5 : 1,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
          <svg style={{ width: '2.5rem', height: '2.5rem', color: 'rgba(200,150,0,0.5)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
          </svg>
          <p style={{ fontWeight: 500, color: 'rgba(245,220,160,0.8)', fontSize: '0.875rem' }}>Arraste arquivos ou clique para selecionar</p>
          <p style={{ fontSize: '0.75rem', color: 'rgba(200,150,80,0.55)' }}>PDF, DOCX, TXT, MD, PNG, JPG</p>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        multiple
        accept=".pdf,.docx,.txt,.md,.png,.jpg,.jpeg,.webp"
        style={{ display: 'none' }}
        onChange={(e) => handleFiles(e.target.files)}
      />

      {staged.length > 0 && (
        <ul style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
          {staged.map((f, i) => (
            <li key={i} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: 'rgba(40,25,0,0.5)',
              border: '1px solid rgba(200,150,0,0.2)',
              borderRadius: '0.5rem',
              padding: '0.5rem 0.75rem',
              fontSize: '0.875rem',
            }}>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'rgba(245,220,160,0.8)', maxWidth: '80%' }}>{f.name}</span>
              <button
                onClick={() => removeFile(i)}
                disabled={disabled}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'rgba(200,150,0,0.45)', fontSize: '0.875rem',
                  marginLeft: '0.5rem', flexShrink: 0, transition: 'color 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.color = 'rgba(220,80,80,0.8)'}
                onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.color = 'rgba(200,150,0,0.45)'}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
