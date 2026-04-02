'use client'

import { useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/layout/header'

const ALL_QUESTIONS = [
  // Institucional
  'Qual é a missão e os valores da Seazone?',
  'Quando a Seazone foi fundada e qual é sua história?',
  'O que diferencia a Seazone de outras empresas do setor?',
  'Quais são os princípios de ESG da Seazone?',
  // Produtos e serviços
  'Como funciona a Gestão Completa da Seazone?',
  'O que é o Spot da Seazone e como funciona?',
  'Quais são os modelos de contrato disponíveis para proprietários?',
  'Quais taxas e comissões a Seazone cobra dos proprietários?',
  // Comercial e onboarding
  'Como funciona o processo de onboarding de um novo imóvel?',
  'Quais são os critérios para aceitar um imóvel na Seazone?',
  'Como é feita a precificação dinâmica dos imóveis?',
  'Quais plataformas (OTAs) a Seazone utiliza para distribuição?',
  // Operação
  'Como funciona o processo de check-in e check-out?',
  'Qual é a política de cancelamento de reservas?',
  'Como funciona o processo de limpeza dos imóveis?',
  'O que acontece quando há danos ao imóvel?',
  'Como funciona o atendimento ao hóspede?',
  // Organização e RH
  'Quantos funcionários ativos a Seazone tem hoje?',
  'Como é a estrutura organizacional da Seazone?',
  'Quais são os benefícios oferecidos aos colaboradores?',
  'Como funciona o processo de avaliação de desempenho?',
  // Tech
  'Quais sistemas internos a Seazone utiliza?',
  'Como funciona a integração com as OTAs?',
  // Dados e métricas
  'Quantas reservas foram feitas esse mês?',
  'Qual imóvel mais faturou nos últimos 30 dias?',
  'Quantos leads entraram essa semana?',
  'Qual a taxa de ocupação média dos imóveis?',
  // Marketing
  'Como é o posicionamento de marca da Seazone?',
  'Quais são as principais campanhas de marketing da Seazone?',
  // Comunicados recentes
  'O que foi comunicado internamente sobre feriados recentes?',
  'O que a Seazone comunicou sobre uso de IA internamente?',
  'Quais foram os comunicados mais recentes do time?',
  // Empreendimentos
  'Quais são os empreendimentos Spot ativos da Seazone?',
  'Como funciona o modelo de investimento no Spot?',
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
    <div className="flex flex-col min-h-full">
      <Header />
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-16 bg-gray-50">
        <div className="max-w-2xl w-full mx-auto text-center space-y-8">

          {/* Hero */}
          <div className="space-y-4">
            <div className="w-20 h-20 rounded-full bg-[#003366] flex items-center justify-center text-white text-3xl font-bold mx-auto shadow-lg">
              O
            </div>
            <h1 className="text-3xl font-bold text-[#003366]">Seazone Oracle</h1>
            <p className="text-gray-500 text-base max-w-md mx-auto leading-relaxed">
              Seu assistente de conhecimento interno. Pergunte sobre processos, políticas,
              dados de hospedagem, equipe e muito mais.
            </p>
          </div>

          {/* CTA */}
          <a
            href="/chat"
            className="inline-block bg-[#003366] hover:bg-[#004488] text-white font-semibold px-8 py-3 rounded-xl transition-colors text-sm shadow"
          >
            Fazer uma pergunta
          </a>

          {/* Perguntas sugeridas */}
          <div className="space-y-3">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">
              Experimente perguntar
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {suggested.map((q) => (
                <button
                  key={q}
                  onClick={() => handleQuestion(q)}
                  className="text-left text-sm bg-white border border-gray-200 rounded-xl px-4 py-3.5 text-gray-700 hover:border-[#003366] hover:text-[#003366] transition-colors shadow-sm leading-snug"
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
