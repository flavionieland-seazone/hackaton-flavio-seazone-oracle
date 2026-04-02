import type { SourceCitation } from '@/types'

interface SourceCardProps {
  sources: SourceCitation[]
}

export function SourceCards({ sources }: SourceCardProps) {
  if (!sources.length) return null

  return (
    <div className="mt-3 flex flex-col gap-1.5">
      <p className="text-xs text-gray-400 font-medium">Fontes consultadas:</p>
      <div className="flex flex-wrap gap-2">
        {sources.map((source, i) => {
          const hasUrl = !!source.fonte_url
          const Tag = hasUrl ? 'a' : 'span'
          const linkProps = hasUrl
            ? { href: source.fonte_url!, target: '_blank', rel: 'noopener noreferrer' }
            : {}
          return (
            <Tag
              key={i}
              {...linkProps}
              className={`inline-flex items-center gap-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 text-gray-600 transition-colors max-w-[250px] ${hasUrl ? 'hover:border-[#003366] hover:text-[#003366] cursor-pointer' : 'cursor-default'}`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                  source.confianca === 'alta' ? 'bg-green-400' : 'bg-yellow-400'
                }`}
              />
              <span className="truncate">{source.title}</span>
              <span className="text-gray-400 flex-shrink-0">{(source.similarity * 100).toFixed(0)}%</span>
            </Tag>
          )
        })}
      </div>
    </div>
  )
}
