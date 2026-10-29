import { useChat } from '../context/ChatContext.jsx';
import ChatHeader from './ChatHeader.jsx';
import MessageList from './MessageList.jsx';
import MessageInput from './MessageInput.jsx';
import ConnectionBanner from './ConnectionBanner.jsx';

// Centre panel: header, scrollable history and the message input.
export default function ChatPane() {
  const { activeConversation } = useChat();
  if (!activeConversation) {
    return (
      <section className="chat-pane chat-empty">
        <p className="muted">Select a chat or search for someone to start talking.</p>
      </section>
    );
  }
  return (
    <section className="chat-pane">
      <ChatHeader conversation={activeConversation} />
      <ConnectionBanner />
      <MessageList />
      <MessageInput />
    </section>
  );
}
