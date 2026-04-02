export function Header() {
  return (
    <header className="bg-[#003366] text-white px-6 py-4 flex items-center justify-between shadow-lg">
      <a href="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
        <div className="w-9 h-9 rounded-full bg-[#00aaff] flex items-center justify-center font-bold text-white text-lg select-none flex-shrink-0">
          O
        </div>
        <div>
          <h1 className="text-lg font-semibold leading-tight">Seazone Oracle</h1>
          <p className="text-xs text-blue-200 leading-tight">Assistente de conhecimento interno</p>
        </div>
      </a>
      <nav className="flex items-center gap-1">
        <a
          href="/"
          className="text-xs text-white/50 hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-white/10"
        >
          Home
        </a>
        <a
          href="/chat"
          className="text-xs text-white/50 hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-white/10"
        >
          Perguntas
        </a>
        <a
          href="/alexandria"
          className="text-xs text-white/50 hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-white/10"
        >
          Biblioteca
        </a>
      </nav>
    </header>
  )
}
