'use client'

export function Header() {
  return (
    <header style={{
      background: 'rgba(8,11,26,0.85)',
      backdropFilter: 'blur(12px)',
      borderBottom: '1px solid rgba(150,180,255,0.1)',
      padding: '0.875rem 1.5rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      position: 'relative',
      zIndex: 20
    }}>
      <a href="/" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none', opacity: 1 }}>
        <div style={{
          width: '2rem', height: '2rem', borderRadius: '50%',
          background: 'linear-gradient(135deg, #2a4a8a, #5a2a9a)',
          border: '1px solid rgba(150,180,255,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 700, color: 'white', fontSize: '0.9rem',
          flexShrink: 0,
          boxShadow: '0 0 10px rgba(100,140,255,0.3)'
        }}>
          O
        </div>
        <div>
          <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'white', lineHeight: 1.2 }}>Seazone Oracle</div>
          <div style={{ fontSize: '0.65rem', color: 'rgba(160,190,255,0.6)', lineHeight: 1.2 }}>Assistente de conhecimento interno</div>
        </div>
      </a>

      <nav style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
        {[
          { label: 'Home', href: '/' },
          { label: 'Perguntas', href: '/chat' },
          { label: 'Biblioteca', href: '/alexandria' },
        ].map(({ label, href }) => (
          <a
            key={href}
            href={href}
            style={{
              fontSize: '0.75rem',
              color: 'rgba(180,200,255,0.6)',
              padding: '0.375rem 0.75rem',
              borderRadius: '0.5rem',
              textDecoration: 'none',
              transition: 'all 0.15s',
              border: '1px solid transparent'
            }}
            onMouseEnter={e => {
              const el = e.currentTarget as HTMLAnchorElement
              el.style.color = 'white'
              el.style.background = 'rgba(255,255,255,0.07)'
              el.style.borderColor = 'rgba(150,180,255,0.2)'
            }}
            onMouseLeave={e => {
              const el = e.currentTarget as HTMLAnchorElement
              el.style.color = 'rgba(180,200,255,0.6)'
              el.style.background = 'transparent'
              el.style.borderColor = 'transparent'
            }}
          >
            {label}
          </a>
        ))}
      </nav>
    </header>
  )
}
