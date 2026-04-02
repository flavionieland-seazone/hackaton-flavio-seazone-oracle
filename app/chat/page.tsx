import { Header } from '@/components/layout/header'
import { ChatInterface } from '@/components/chat/chat-interface'

interface Props {
  searchParams: Promise<{ q?: string }>
}

export default async function ChatPage({ searchParams }: Props) {
  const { q } = await searchParams
  return (
    <div className="flex flex-col h-full">
      <Header />
      <main className="flex-1 overflow-hidden">
        <ChatInterface initialQuery={q} />
      </main>
    </div>
  )
}
