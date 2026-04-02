import { Header } from '@/components/layout/header'
import { ChatInterface } from '@/components/chat/chat-interface'

export default function ChatPage() {
  return (
    <div className="flex flex-col h-full">
      <Header />
      <main className="flex-1 overflow-hidden">
        <ChatInterface />
      </main>
    </div>
  )
}
