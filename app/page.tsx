'use client'

import { useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Header } from '@/components/layout/header'

const ALL_QUESTIONS = [
  'Qual é a missão e os valores da Seazone?',
  'Quando a Seazone foi fundada e qual é sua história?',
  'O que diferencia a Seazone de outras empresas do setor?',
  'Quais são os princípios de ESG da Seazone?',
  'Como funciona a Gestão Completa da Seazone?',
  'O que é o Spot da Seazone e como funciona?',
  'Quais são os modelos de contrato disponíveis para proprietários?',
  'Quais taxas e comissões a Seazone cobra dos proprietários?',
  'Como funciona o processo de onboarding de um novo imóvel?',
  'Quais são os critérios para aceitar um imóvel na Seazone?',
  'Como é feita a precificação dinâmica dos imóveis?',
  'Quais plataformas (OTAs) a Seazone utiliza para distribuição?',
  'Como funciona o processo de check-in e check-out?',
  'Qual é a política de cancelamento de reservas?',
  'Como funciona o processo de limpeza dos imóveis?',
  'O que acontece quando há danos ao imóvel?',
  'Como funciona o atendimento ao hóspede?',
  'Quantos funcionários ativos a Seazone tem hoje?',
  'Como é a estrutura organizacional da Seazone?',
  'Quais são os benefícios oferecidos aos colaboradores?',
  'Como funciona o processo de avaliação de desempenho?',
  'Quais sistemas internos a Seazone utiliza?',
  'Como funciona a integração com as OTAs?',
  'Quantas reservas foram feitas esse mês?',
  'Qual imóvel mais faturou nos últimos 30 dias?',
  'Quantos leads entraram essa semana?',
  'Qual a taxa de ocupação média dos imóveis?',
  'Como é o posicionamento de marca da Seazone?',
  'Quais são as principais campanhas de marketing da Seazone?',
  'O que foi comunicado internamente sobre feriados recentes?',
  'O que a Seazone comunicou sobre uso de IA internamente?',
  'Quais foram os comunicados mais recentes do time?',
  'Quais são os empreendimentos Spot ativos da Seazone?',
  'Como funciona o modelo de investimento no Spot?',
  'Qual o prazo de entrega dos empreendimentos em andamento?',
]

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export default function HomePage() {
  const router = useRouter()
  const suggested = useMemo(() => shuffle(ALL_QUESTIONS).slice(0, 4), [])

  function handleQuestion(q: string) {
    router.push(`/chat?q=${encodeURIComponent(q)}`)
  }

  return (
    <div className="flex flex-col min-h-full" style={{ background: '#080b1a' }}>
      <Header />

      {/* Wallpaper com zoom suave */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/wallpaper.avif"
          alt=""
          className="bg-wallpaper"
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'center',
            transformOrigin: 'center center',
          }}
        />
        {/* Overlay escuro para legibilidade + transição suave com o conteúdo */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(to bottom, rgba(8,11,26,0.45) 0%, rgba(8,11,26,0.55) 40%, rgba(8,11,26,0.75) 70%, rgba(8,11,26,0.95) 100%)',
        }} />
        {/* Vinheta radial central para destacar a logo */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(ellipse 60% 55% at 50% 42%, transparent 0%, rgba(8,11,26,0.5) 100%)',
        }} />
      </div>

      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-12">
        <div className="max-w-2xl w-full mx-auto text-center space-y-8">

          {/* Logo */}
          <div className="flex flex-col items-center gap-6">
            <div style={{
              filter: 'drop-shadow(0 0 30px rgba(100,140,255,0.5)) drop-shadow(0 0 60px rgba(120,60,200,0.3))'
            }}>
              <Image
                src="/oracle-logo.jpg"
                alt="Seazone Oracle"
                width={220}
                height={220}
                className="rounded-2xl"
                priority
              />
            </div>
            <div>
              <h1 style={{
                fontSize: '2rem', fontWeight: 700, letterSpacing: '0.05em',
                background: 'linear-gradient(135deg, #a0c4ff 0%, #c8a8ff 50%, #ffffff 100%)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
              }}>
                SEAZONE ORACLE
              </h1>
              <p style={{ color: 'rgba(180,200,255,0.7)', fontSize: '0.875rem', marginTop: '0.5rem' }}>
                Seu assistente de conhecimento interno
              </p>
            </div>
          </div>

          {/* CTA */}
          <a
            href="/chat"
            style={{
              display: 'inline-block',
              background: 'linear-gradient(135deg, #2a4a8a 0%, #5a2a9a 100%)',
              border: '1px solid rgba(150,180,255,0.3)',
              color: 'white',
              fontWeight: 600,
              padding: '0.75rem 2.5rem',
              borderRadius: '0.75rem',
              fontSize: '0.875rem',
              boxShadow: '0 0 20px rgba(100,140,255,0.2)',
              transition: 'all 0.2s',
              textDecoration: 'none'
            }}
          >
            ✦ Fazer uma pergunta
          </a>

          {/* Perguntas sugeridas */}
          <div className="space-y-3">
            <p style={{ color: 'rgba(160,180,255,0.5)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.15em' }}>
              Experimente perguntar
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {suggested.map((q) => (
                <button
                  key={q}
                  onClick={() => handleQuestion(q)}
                  style={{
                    textAlign: 'left',
                    fontSize: '0.8rem',
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(150,180,255,0.15)',
                    borderRadius: '0.75rem',
                    padding: '0.875rem 1rem',
                    color: 'rgba(200,220,255,0.85)',
                    lineHeight: '1.4',
                    transition: 'all 0.2s',
                    cursor: 'pointer',
                    backdropFilter: 'blur(8px)'
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLButtonElement).style.background = 'rgba(100,140,255,0.1)'
                    ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(150,180,255,0.4)'
                    ;(e.currentTarget as HTMLButtonElement).style.color = '#ffffff'
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.04)'
                    ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(150,180,255,0.15)'
                    ;(e.currentTarget as HTMLButtonElement).style.color = 'rgba(200,220,255,0.85)'
                  }}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

        </div>
      </main>
    </div>
  )
}
