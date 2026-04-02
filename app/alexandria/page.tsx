'use client'

import { useState } from 'react'
import { Header } from '@/components/layout/header'
import { UploadZone } from '@/components/alexandria/upload-zone'
import { ProcessStatus } from '@/components/alexandria/process-status'

type Mode = 'file' | 'text'

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

export default function AlexandriaPage() {
  const [mode, setMode] = useState<Mode>('file')
  const [files, setFiles] = useState<File[]>([])
  const [freeText, setFreeText] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [phase, setPhase] = useState<string>()
  const [results, setResults] = useState<IngestedDoc[]>([])
  const [errors, setErrors] = useState<ErrorItem[]>([])

  const canSubmit = !loading && (mode === 'file' ? files.length > 0 : freeText.trim().length > 0)

  async function handleSubmit() {
    setLoading(true)
    setPhase('Enviando conteúdo para o Toth...')
    setResults([])
    setErrors([])

    try {
      const form = new FormData()
      if (notes.trim()) form.append('notes', notes)

      if (mode === 'file') {
        files.forEach((f) => form.append('files', f))
        setPhase('Extraindo texto dos arquivos...')
      } else {
        form.append('text', freeText)
      }

      setPhase('Toth está organizando o conteúdo...')
      const res = await fetch('/api/alexandria', { method: 'POST', body: form })
      const json = await res.json()

      setResults(json.documents ?? [])
      setErrors(json.errors ?? [])

      if (json.documents?.length > 0) {
        setFiles([])
        setFreeText('')
        setNotes('')
      }
    } catch {
      setErrors([{ name: 'Erro de rede', error: 'Não foi possível conectar ao servidor.' }])
    } finally {
      setLoading(false)
      setPhase(undefined)
    }
  }

  return (
    <div className="flex flex-col h-full">
      <Header />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">

          {/* Hero */}
          <div className="space-y-1">
            <h2 className="text-2xl font-semibold text-[#003366]">Biblioteca de Alexandria</h2>
            <p className="text-sm text-gray-500">
              Envie arquivos ou cole texto — o agente Toth organiza e indexa automaticamente na base de conhecimento.
            </p>
          </div>

          {/* Mode toggle */}
          <div className="flex rounded-lg border border-gray-200 overflow-hidden w-fit">
            {(['file', 'text'] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                disabled={loading}
                className={[
                  'px-5 py-2 text-sm font-medium transition-colors',
                  mode === m
                    ? 'bg-[#003366] text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50',
                ].join(' ')}
              >
                {m === 'file' ? 'Arquivos' : 'Texto livre'}
              </button>
            ))}
          </div>

          {/* Input area */}
          {mode === 'file' ? (
            <UploadZone onFiles={setFiles} disabled={loading} />
          ) : (
            <textarea
              value={freeText}
              onChange={(e) => setFreeText(e.target.value)}
              disabled={loading}
              rows={10}
              placeholder="Cole aqui um texto, comunicado, procedimento..."
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-[#003366]/30 focus:border-[#003366] disabled:opacity-50"
            />
          )}

          {/* Notes */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Contexto adicional <span className="font-normal normal-case">(opcional)</span>
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={loading}
              placeholder="Ex: isso é sobre o novo empreendimento Park Avenue"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003366]/30 focus:border-[#003366] disabled:opacity-50"
            />
          </div>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="w-full bg-[#003366] hover:bg-[#004488] disabled:bg-gray-300 text-white font-medium py-3 rounded-xl transition-colors text-sm"
          >
            {loading ? 'Processando...' : 'Enviar para o Toth'}
          </button>

          {/* Status / Results */}
          <ProcessStatus loading={loading} phase={phase} results={results} errors={errors} />

        </div>
      </main>
    </div>
  )
}
