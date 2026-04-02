'use client'

import { useState } from 'react'
import Image from 'next/image'
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

const TOTH_GREETING = 'Saudações, guardião do saber. Sou Toth, escriba dos deuses e guardião da sabedoria ancestral. Entrega-me teus escritos — documentos, comunicados, procedimentos — e eu os organizo e preservo nos salões eternos desta biblioteca.'

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
    setPhase('Toth está recebendo o pergaminho...')
    setResults([])
    setErrors([])

    try {
      const form = new FormData()
      if (notes.trim()) form.append('notes', notes)

      if (mode === 'file') {
        files.forEach((f) => form.append('files', f))
        setPhase('Extraindo o texto sagrado...')
      } else {
        form.append('text', freeText)
      }

      setPhase('Toth está organizando o conhecimento...')
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
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%', position: 'relative', background: '#0d0800', overflow: 'hidden' }}>
      <Header />

      {/* Egyptian background */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        {/* Base warm gradient */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse at 40% 50%, #2a1500 0%, #0d0800 60%)',
        }} />

        {/* Candlelight glow spots */}
        <div style={{
          position: 'absolute', top: '10%', left: '5%', width: '300px', height: '300px',
          background: 'radial-gradient(ellipse, rgba(200,130,0,0.08) 0%, transparent 70%)',
          borderRadius: '50%', filter: 'blur(40px)',
        }} />
        <div style={{
          position: 'absolute', bottom: '15%', right: '8%', width: '250px', height: '250px',
          background: 'radial-gradient(ellipse, rgba(180,100,0,0.07) 0%, transparent 70%)',
          borderRadius: '50%', filter: 'blur(35px)',
        }} />
        <div style={{
          position: 'absolute', top: '50%', right: '20%', width: '200px', height: '200px',
          background: 'radial-gradient(ellipse, rgba(220,160,0,0.05) 0%, transparent 70%)',
          borderRadius: '50%', filter: 'blur(30px)',
        }} />

        {/* Hieroglyph texture — vertical columns of symbols */}
        <div style={{
          position: 'absolute', inset: 0, opacity: 0.04,
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='120'%3E%3Crect width='80' height='120' fill='none'/%3E%3Ccircle cx='20' cy='15' r='6' stroke='%23d4a017' stroke-width='1.5' fill='none'/%3E%3Cline x1='20' y1='21' x2='20' y2='35' stroke='%23d4a017' stroke-width='1.5'/%3E%3Cline x1='14' y1='27' x2='26' y2='27' stroke='%23d4a017' stroke-width='1.5'/%3E%3Crect x='13' y='42' width='14' height='10' rx='2' stroke='%23d4a017' stroke-width='1.2' fill='none'/%3E%3Cline x1='20' y1='52' x2='20' y2='62' stroke='%23d4a017' stroke-width='1.2'/%3E%3Cellipse cx='20' cy='72' rx='7' ry='4' stroke='%23d4a017' stroke-width='1.2' fill='none'/%3E%3Cline x1='13' y1='72' x2='27' y2='72' stroke='%23d4a017' stroke-width='1.2'/%3E%3Cpolygon points='20,82 14,95 26,95' stroke='%23d4a017' stroke-width='1.2' fill='none'/%3E%3Ccircle cx='20' cy='108' r='4' stroke='%23d4a017' stroke-width='1.2' fill='none'/%3E%3Cline x1='16' y1='108' x2='24' y2='108' stroke='%23d4a017' stroke-width='1.2'/%3E%3Ccircle cx='60' cy='20' r='4' stroke='%23d4a017' stroke-width='1.2' fill='none'/%3E%3Crect x='53' y='30' width='14' height='18' rx='1' stroke='%23d4a017' stroke-width='1.2' fill='none'/%3E%3Cline x1='60' y1='48' x2='60' y2='58' stroke='%23d4a017' stroke-width='1.2'/%3E%3Cline x1='54' y1='53' x2='66' y2='53' stroke='%23d4a017' stroke-width='1.2'/%3E%3Cellipse cx='60' cy='70' rx='5' ry='8' stroke='%23d4a017' stroke-width='1.2' fill='none'/%3E%3Ccircle cx='60' cy='85' r='6' stroke='%23d4a017' stroke-width='1.2' fill='none'/%3E%3Cline x1='60' y1='79' x2='60' y2='71' stroke='%23d4a017' stroke-width='1.2'/%3E%3Cpolygon points='60,96 54,110 66,110' stroke='%23d4a017' stroke-width='1.2' fill='none'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat',
        }} />

        {/* Stone column borders on sides */}
        <div style={{
          position: 'absolute', left: 0, top: 0, bottom: 0, width: '4px',
          background: 'linear-gradient(180deg, transparent 0%, rgba(200,150,0,0.3) 30%, rgba(200,150,0,0.3) 70%, transparent 100%)',
        }} />
        <div style={{
          position: 'absolute', right: 0, top: 0, bottom: 0, width: '4px',
          background: 'linear-gradient(180deg, transparent 0%, rgba(200,150,0,0.3) 30%, rgba(200,150,0,0.3) 70%, transparent 100%)',
        }} />
      </div>

      {/* Main content */}
      <main style={{ flex: 1, overflowY: 'auto', position: 'relative', zIndex: 2, padding: '2rem 1rem' }}>
        <div style={{ maxWidth: '680px', margin: '0 auto' }}>

          {/* Toth section */}
          <div style={{
            display: 'flex', gap: '1.25rem', alignItems: 'flex-start', marginBottom: '2.5rem',
          }}>
            {/* Toth avatar */}
            <div style={{ flexShrink: 0 }}>
              <div style={{
                width: '90px', height: '90px', borderRadius: '50%', overflow: 'hidden',
                border: '2px solid rgba(200,150,0,0.5)',
                boxShadow: '0 0 20px rgba(200,130,0,0.25), 0 0 40px rgba(200,130,0,0.1)',
              }}>
                <Image src="/toth.jpg" alt="Toth" width={90} height={90} style={{ objectFit: 'cover', objectPosition: 'top' }} />
              </div>
              <p style={{ textAlign: 'center', fontSize: '0.65rem', color: 'rgba(200,160,0,0.6)', marginTop: '0.375rem', letterSpacing: '0.05em' }}>TOTH</p>
            </div>

            {/* Speech bubble */}
            <div style={{ position: 'relative', flex: 1, marginTop: '0.5rem' }}>
              {/* Arrow */}
              <div style={{
                position: 'absolute', left: '-8px', top: '16px',
                width: 0, height: 0,
                borderTop: '8px solid transparent',
                borderBottom: '8px solid transparent',
                borderRight: '8px solid rgba(200,150,0,0.35)',
              }} />
              <div style={{
                background: 'rgba(40,25,0,0.7)',
                border: '1px solid rgba(200,150,0,0.35)',
                borderRadius: '0 1rem 1rem 1rem',
                padding: '0.875rem 1rem',
                backdropFilter: 'blur(8px)',
              }}>
                <p style={{
                  fontSize: '0.8rem',
                  color: 'rgba(245,220,160,0.85)',
                  lineHeight: 1.6,
                  fontStyle: 'italic',
                }}>
                  &ldquo;{TOTH_GREETING}&rdquo;
                </p>
              </div>
            </div>
          </div>

          {/* Decorative divider */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem',
          }}>
            <div style={{ flex: 1, height: '1px', background: 'linear-gradient(90deg, transparent, rgba(200,150,0,0.4))' }} />
            <span style={{ fontSize: '1rem', color: 'rgba(200,150,0,0.5)' }}>𓂀</span>
            <div style={{ flex: 1, height: '1px', background: 'linear-gradient(90deg, rgba(200,150,0,0.4), transparent)' }} />
          </div>

          {/* Mode toggle */}
          <div style={{ display: 'flex', borderRadius: '0.75rem', border: '1px solid rgba(200,150,0,0.3)', overflow: 'hidden', width: 'fit-content', marginBottom: '1.25rem' }}>
            {(['file', 'text'] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                disabled={loading}
                style={{
                  padding: '0.5rem 1.25rem',
                  fontSize: '0.8rem',
                  fontWeight: 500,
                  border: 'none',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.15s',
                  background: mode === m
                    ? 'linear-gradient(135deg, #7a4a00, #b87000)'
                    : 'rgba(255,255,255,0.03)',
                  color: mode === m ? 'rgba(255,235,180,0.95)' : 'rgba(200,160,80,0.65)',
                }}
              >
                {m === 'file' ? '📜 Arquivos' : '✍️ Texto livre'}
              </button>
            ))}
          </div>

          {/* Input area */}
          {mode === 'file' ? (
            <div style={{ marginBottom: '1.25rem' }}>
              <UploadZone onFiles={setFiles} disabled={loading} />
            </div>
          ) : (
            <textarea
              value={freeText}
              onChange={(e) => setFreeText(e.target.value)}
              disabled={loading}
              rows={10}
              placeholder="Cole aqui um texto, comunicado, procedimento..."
              style={{
                width: '100%', display: 'block',
                background: 'rgba(40,25,0,0.5)',
                border: '1px solid rgba(200,150,0,0.3)',
                borderRadius: '0.75rem',
                padding: '0.75rem 1rem',
                fontSize: '0.875rem',
                color: 'rgba(245,220,160,0.9)',
                resize: 'vertical',
                outline: 'none',
                marginBottom: '1.25rem',
                opacity: loading ? 0.5 : 1,
                boxSizing: 'border-box',
              }}
            />
          )}

          {/* Notes */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 500, color: 'rgba(200,150,0,0.6)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.375rem' }}>
              Contexto adicional <span style={{ fontWeight: 400, textTransform: 'none' }}>(opcional)</span>
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={loading}
              placeholder="Ex: isso é sobre o novo empreendimento Park Avenue"
              style={{
                width: '100%', display: 'block',
                background: 'rgba(40,25,0,0.5)',
                border: '1px solid rgba(200,150,0,0.25)',
                borderRadius: '0.5rem',
                padding: '0.625rem 0.875rem',
                fontSize: '0.875rem',
                color: 'rgba(245,220,160,0.9)',
                outline: 'none',
                opacity: loading ? 0.5 : 1,
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            style={{
              width: '100%',
              background: canSubmit
                ? 'linear-gradient(135deg, #7a4a00 0%, #b87000 50%, #d4940a 100%)'
                : 'rgba(80,60,20,0.3)',
              border: `1px solid ${canSubmit ? 'rgba(200,150,0,0.5)' : 'rgba(200,150,0,0.15)'}`,
              color: canSubmit ? 'rgba(255,235,180,0.95)' : 'rgba(200,150,0,0.3)',
              fontWeight: 600,
              padding: '0.875rem',
              borderRadius: '0.75rem',
              fontSize: '0.875rem',
              cursor: canSubmit ? 'pointer' : 'not-allowed',
              transition: 'all 0.2s',
              boxShadow: canSubmit ? '0 0 20px rgba(180,120,0,0.2)' : 'none',
              letterSpacing: '0.03em',
            }}
          >
            {loading ? `⏳ ${phase ?? 'Processando...'}` : '𓂀 Entregar ao Toth'}
          </button>

          {/* Status / Results */}
          <div style={{ marginTop: '1.5rem' }}>
            <ProcessStatus loading={loading} phase={phase} results={results} errors={errors} />
          </div>

        </div>
      </main>
    </div>
  )
}
