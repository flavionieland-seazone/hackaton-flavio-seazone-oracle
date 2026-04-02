'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'sent' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = email.trim().toLowerCase()

    if (!trimmed.endsWith('@seazone.com.br')) {
      setErrorMsg('Apenas emails @seazone.com.br têm acesso.')
      setStatus('error')
      return
    }

    setStatus('loading')
    setErrorMsg('')

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed }),
      })
      const json = await res.json()
      if (!res.ok) {
        setErrorMsg(json.error ?? 'Erro ao enviar link.')
        setStatus('error')
      } else {
        setStatus('sent')
      }
    } catch {
      setErrorMsg('Falha de conexão. Tente novamente.')
      setStatus('error')
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      background: '#080b1a', position: 'relative', overflow: 'hidden', padding: '1rem',
    }}>
      {/* Fundo cósmico */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse at 55% 40%, #1a0a3a 0%, #080b1a 65%)',
        }} />
        <div style={{
          position: 'absolute', inset: 0, opacity: 0.6,
          backgroundImage: `
            radial-gradient(1px 1px at 8% 12%, rgba(255,255,255,0.8) 0%, transparent 100%),
            radial-gradient(1px 1px at 22% 38%, rgba(255,255,255,0.5) 0%, transparent 100%),
            radial-gradient(1.5px 1.5px at 38% 8%, rgba(255,255,255,0.8) 0%, transparent 100%),
            radial-gradient(1px 1px at 52% 52%, rgba(255,255,255,0.4) 0%, transparent 100%),
            radial-gradient(1px 1px at 68% 18%, rgba(255,255,255,0.6) 0%, transparent 100%),
            radial-gradient(1.5px 1.5px at 78% 68%, rgba(255,255,255,0.7) 0%, transparent 100%),
            radial-gradient(1px 1px at 88% 38%, rgba(255,255,255,0.5) 0%, transparent 100%),
            radial-gradient(1px 1px at 15% 75%, rgba(255,255,255,0.4) 0%, transparent 100%),
            radial-gradient(2px 2px at 60% 80%, rgba(180,160,255,0.5) 0%, transparent 100%),
            radial-gradient(1.5px 1.5px at 85% 15%, rgba(255,255,255,0.8) 0%, transparent 100%)
          `,
        }} />
        <div style={{
          position: 'absolute', top: '8%', right: '6%', width: '280px', height: '280px',
          background: 'radial-gradient(ellipse, rgba(120,40,180,0.13) 0%, transparent 70%)',
          borderRadius: '50%', filter: 'blur(40px)',
        }} />
      </div>

      {/* Card de login */}
      <div style={{
        position: 'relative', zIndex: 2,
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(150,180,255,0.15)',
        borderRadius: '1.25rem',
        padding: '2.5rem 2rem',
        width: '100%', maxWidth: '380px',
        backdropFilter: 'blur(16px)',
        boxShadow: '0 0 40px rgba(100,60,200,0.15)',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
            <Image
              src="/crystal-ball.png"
              alt="Oracle"
              width={64}
              height={64}
              style={{
                objectFit: 'contain',
                filter: 'drop-shadow(0 0 15px rgba(140,100,255,0.7)) drop-shadow(0 0 30px rgba(100,60,200,0.4))',
              }}
            />
          </div>
          <h1 style={{
            fontSize: '1.4rem', fontWeight: 700, letterSpacing: '0.06em',
            background: 'linear-gradient(135deg, #a0c4ff 0%, #c8a8ff 60%, #ffffff 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
            marginBottom: '0.25rem',
          }}>
            SEAZONE ORACLE
          </h1>
          <p style={{ fontSize: '0.75rem', color: 'rgba(160,190,255,0.5)' }}>
            Acesso restrito a colaboradores Seazone
          </p>
        </div>

        {status === 'sent' ? (
          <div style={{
            textAlign: 'center',
            background: 'rgba(60,180,100,0.1)',
            border: '1px solid rgba(60,200,100,0.25)',
            borderRadius: '0.875rem',
            padding: '1.5rem 1rem',
          }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>📬</div>
            <p style={{ color: 'rgba(160,240,180,0.9)', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.375rem' }}>
              Link enviado!
            </p>
            <p style={{ color: 'rgba(120,200,150,0.7)', fontSize: '0.8rem', lineHeight: 1.5 }}>
              Verifique sua caixa de entrada em <strong style={{ color: 'rgba(160,240,180,0.85)' }}>{email}</strong> e clique no link de acesso.
            </p>
            <button
              onClick={() => { setStatus('idle'); setEmail('') }}
              style={{
                marginTop: '1rem', background: 'none', border: 'none',
                color: 'rgba(120,180,255,0.7)', fontSize: '0.75rem', cursor: 'pointer',
                textDecoration: 'underline',
              }}
            >
              Usar outro email
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{
                display: 'block', fontSize: '0.75rem', fontWeight: 500,
                color: 'rgba(160,190,255,0.6)', marginBottom: '0.375rem', letterSpacing: '0.04em',
              }}>
                EMAIL CORPORATIVO
              </label>
              <input
                ref={inputRef}
                type="email"
                value={email}
                onChange={e => { setEmail(e.target.value); if (status === 'error') setStatus('idle') }}
                placeholder="seu.nome@seazone.com.br"
                required
                autoFocus
                style={{
                  width: '100%', boxSizing: 'border-box',
                  background: 'rgba(255,255,255,0.05)',
                  border: `1px solid ${status === 'error' ? 'rgba(220,80,80,0.5)' : 'rgba(150,180,255,0.2)'}`,
                  borderRadius: '0.625rem',
                  padding: '0.75rem 1rem',
                  fontSize: '0.875rem',
                  color: 'rgba(220,235,255,0.9)',
                  outline: 'none',
                }}
              />
              {status === 'error' && (
                <p style={{ color: 'rgba(220,100,100,0.9)', fontSize: '0.75rem', marginTop: '0.375rem' }}>
                  {errorMsg}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={status === 'loading' || !email.trim()}
              style={{
                background: status === 'loading' || !email.trim()
                  ? 'rgba(255,255,255,0.08)'
                  : 'linear-gradient(135deg, #2a4a8a 0%, #5a2a9a 100%)',
                border: '1px solid rgba(150,180,255,0.25)',
                color: status === 'loading' || !email.trim() ? 'rgba(180,200,255,0.3)' : 'white',
                fontWeight: 600,
                padding: '0.8rem',
                borderRadius: '0.625rem',
                fontSize: '0.875rem',
                cursor: status === 'loading' || !email.trim() ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
                boxShadow: status === 'loading' || !email.trim() ? 'none' : '0 0 15px rgba(100,140,255,0.2)',
              }}
            >
              {status === 'loading' ? 'Enviando...' : '✦ Enviar link de acesso'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
