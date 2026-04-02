export function Header() {
  return (
    <header className="bg-[#003366] text-white px-6 py-4 flex items-center gap-3 shadow-lg">
      <div className="w-9 h-9 rounded-full bg-[#00aaff] flex items-center justify-center font-bold text-white text-lg select-none flex-shrink-0">
        O
      </div>
      <div>
        <h1 className="text-lg font-semibold leading-tight">Seazone Oracle</h1>
        <p className="text-xs text-blue-200 leading-tight">Assistente de conhecimento interno</p>
      </div>
    </header>
  )
}
