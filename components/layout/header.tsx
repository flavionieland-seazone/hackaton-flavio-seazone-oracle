'use client'

const NAV_LINKS = [
  { label: 'Home', href: '/' },
  { label: 'Perguntas', href: '/chat' },
  { label: 'Biblioteca', href: '/alexandria' },
]

export function Header() {
  return (
    <header style={{
      background: 'rgba(8,11,26,0.9)',
      backdropFilter: 'blur(12px)',
      borderBottom: '1px solid rgba(150,180,255,0.12)',
      padding: '0.875rem 1.5rem',
      display: 'grid',
      gridTemplateColumns: '1fr auto 1fr',
      alignItems: 'center',
      position: 'relative',
      zIndex: 20,
    }}>
      {/* Logo — esquerda */}
      <a href="/" style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', textDecoration: 'none' }}>
        <span style={{ fontSize: '1.75rem', filter: 'drop-shadow(0 0 8px rgba(140,100,255,0.6))' }}>🔮</span>
        <div>
          <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'white', lineHeight: 1.2, letterSpacing: '0.02em' }}>Seazone Oracle</div>
          <div style={{ fontSize: '0.6rem', color: 'rgba(160,190,255,0.55)', lineHeight: 1.2 }}>Assistente de conhecimento interno</div>
        </div>
      </a>

      {/* Nav — centro */}
      <nav style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
        {NAV_LINKS.map(({ label, href }) => (
          <a
            key={href}
            href={href}
            style={{
              fontSize: '0.875rem',
              fontWeight: 600,
              color: 'rgba(180,210,255,0.85)',
              padding: '0.5rem 1.1rem',
              borderRadius: '0.625rem',
              textDecoration: 'none',
              transition: 'all 0.2s',
              border: '1px solid rgba(150,180,255,0.12)',
              background: 'rgba(100,140,255,0.05)',
              letterSpacing: '0.02em',
              textShadow: '0 0 10px rgba(150,180,255,0.5), 0 0 25px rgba(100,140,255,0.3)',
            }}
            onMouseEnter={e => {
              const el = e.currentTarget as HTMLAnchorElement
              el.style.color = 'white'
              el.style.background = 'rgba(100,140,255,0.15)'
              el.style.borderColor = 'rgba(150,180,255,0.4)'
              el.style.textShadow = '0 0 12px rgba(200,220,255,0.9), 0 0 30px rgba(150,180,255,0.7), 0 0 50px rgba(100,140,255,0.4)'
              el.style.boxShadow = '0 0 12px rgba(100,140,255,0.2)'
            }}
            onMouseLeave={e => {
              const el = e.currentTarget as HTMLAnchorElement
              el.style.color = 'rgba(180,210,255,0.85)'
              el.style.background = 'rgba(100,140,255,0.05)'
              el.style.borderColor = 'rgba(150,180,255,0.12)'
              el.style.textShadow = '0 0 10px rgba(150,180,255,0.5), 0 0 25px rgba(100,140,255,0.3)'
              el.style.boxShadow = 'none'
            }}
          >
            {label}
          </a>
        ))}
      </nav>

      {/* Espaço direita — balança o grid */}
      <div />
    </header>
  )
}
