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
    <div className="space-y-3">
      <div
        onClick={() => !disabled && inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          handleFiles(e.dataTransfer.files)
        }}
        className={[
          'border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors',
          disabled ? 'opacity-50 cursor-not-allowed' : '',
          dragging
            ? 'border-[#003366] bg-[#003366]/5'
            : 'border-gray-300 hover:border-[#003366]/50 hover:bg-gray-50',
        ].join(' ')}
      >
        <div className="flex flex-col items-center gap-2 text-gray-500">
          <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
          </svg>
          <p className="font-medium text-gray-700">Arraste arquivos ou clique para selecionar</p>
          <p className="text-sm">PDF, DOCX, TXT, MD, PNG, JPG</p>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        multiple
        accept=".pdf,.docx,.txt,.md,.png,.jpg,.jpeg,.webp"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {staged.length > 0 && (
        <ul className="space-y-1.5">
          {staged.map((f, i) => (
            <li key={i} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 text-sm">
              <span className="truncate text-gray-700 max-w-[80%]">{f.name}</span>
              <button
                onClick={() => removeFile(i)}
                disabled={disabled}
                className="text-gray-400 hover:text-red-500 transition-colors ml-2 flex-shrink-0"
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
