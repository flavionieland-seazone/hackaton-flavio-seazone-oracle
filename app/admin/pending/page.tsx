'use client'

import { useEffect, useState } from 'react'
import type { OraclePendingQuestion } from '@/types'

const SECTIONS = [
  '01-institucional',
  '02-bus',
  '03-empreendimentos',
  '04-comercial',
  '05-contratos',
  '06-operacao',
  '07-organizacao',
  '08-tech',
  '09-marketing',
  '10-dados-mercado',
]

export default function AdminPendingPage() {
  const [questions, setQuestions] = useState<OraclePendingQuestion[]>([])
  const [loading, setLoading] = useState(true)
  const [activeId, setActiveId] = useState<number | null>(null)
  const [answer, setAnswer] = useState('')
  const [section, setSection] = useState(SECTIONS[0])
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

  async function load() {
    setLoading(true)
    const res = await fetch('/api/admin/pending')
    const data = await res.json()
    setQuestions(data)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function showToast(type: 'success' | 'error', msg: string) {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 4000)
  }

  async function handleReject(id: number) {
    await fetch('/api/admin/pending', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status: 'rejected' }),
    })
    setQuestions((prev) => prev.filter((q) => q.id !== id))
    showToast('success', 'Pergunta rejeitada.')
  }

  async function handleIngest(q: OraclePendingQuestion) {
    if (!answer.trim()) return
    setSaving(true)
    try {
      const res = await fetch('/api/admin/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pending_id: q.id,
          question: q.question,
          answer,
          target_section: section,
          answered_by: 'admin',
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setQuestions((prev) => prev.filter((item) => item.id !== q.id))
      setActiveId(null)
      setAnswer('')
      showToast('success', `Ingerido! O Oracle já sabe responder essa pergunta.`)
    } catch (err) {
      showToast('error', `Erro: ${(err as Error).message}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-[#003366] text-white px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center font-bold text-sm">O</div>
          <div>
            <div className="font-semibold">Seazone Oracle — Admin</div>
            <div className="text-xs text-white/60">Perguntas sem resposta</div>
          </div>
        </div>
        <a href="/chat" className="text-xs text-white/60 hover:text-white transition-colors">← Voltar ao chat</a>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Toast */}
        {toast && (
          <div className={`mb-6 px-4 py-3 rounded-lg text-sm font-medium ${toast.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
            {toast.msg}
          </div>
        )}

        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-semibold text-gray-800">
            Perguntas pendentes
            {!loading && <span className="ml-2 text-sm font-normal text-gray-400">({questions.length})</span>}
          </h1>
          <button onClick={load} className="text-sm text-[#003366] hover:underline">Atualizar</button>
        </div>

        {loading && (
          <div className="text-center py-16 text-gray-400 text-sm">Carregando...</div>
        )}

        {!loading && questions.length === 0 && (
          <div className="text-center py-16">
            <div className="text-4xl mb-3">✓</div>
            <p className="text-gray-500 text-sm">Nenhuma pergunta pendente. O Oracle está bem alimentado!</p>
          </div>
        )}

        <div className="space-y-4">
          {questions.map((q) => (
            <div key={q.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              {/* Pergunta */}
              <div className="px-5 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <p className="text-gray-800 font-medium text-sm leading-relaxed">{q.question}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-xs text-gray-400">
                        {new Date(q.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{q.source}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => { setActiveId(activeId === q.id ? null : q.id); setAnswer('') }}
                      className="text-xs bg-[#003366] text-white px-3 py-1.5 rounded-lg hover:bg-[#002244] transition-colors"
                    >
                      {activeId === q.id ? 'Cancelar' : 'Responder'}
                    </button>
                    <button
                      onClick={() => handleReject(q.id)}
                      className="text-xs text-gray-400 hover:text-red-500 transition-colors px-2 py-1.5"
                    >
                      Rejeitar
                    </button>
                  </div>
                </div>
              </div>

              {/* Form de resposta */}
              {activeId === q.id && (
                <div className="border-t border-gray-100 bg-gray-50 px-5 py-4 space-y-3">
                  <div>
                    <label className="text-xs font-medium text-gray-600 block mb-1">Seção da base de conhecimento</label>
                    <select
                      value={section}
                      onChange={(e) => setSection(e.target.value)}
                      className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#003366]/20"
                    >
                      {SECTIONS.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 block mb-1">Resposta</label>
                    <textarea
                      value={answer}
                      onChange={(e) => setAnswer(e.target.value)}
                      placeholder="Escreva a resposta completa aqui. Suporta markdown."
                      rows={5}
                      className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#003366]/20 resize-none"
                    />
                  </div>
                  <button
                    onClick={() => handleIngest(q)}
                    disabled={!answer.trim() || saving}
                    className="w-full text-sm bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                  >
                    {saving ? 'Salvando e ingerindo...' : 'Salvar e ensinar ao Oracle'}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
