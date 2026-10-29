import { useChat } from '../context/ChatContext.jsx';
import PresenceText from './PresenceText.jsx';
import TypingIndicator from './TypingIndicator.jsx';

export default function ChatHeader({ conversation }) {
  const { closeConversation } = useChat();
  return (
    <header className="chat-header">
      <button type="button" className="btn btn-small btn-secondary back-btn" onClick={closeConversation} aria-label="Back to chats">
        ←
      </button>
      <div className="chat-header-title">
        <strong>{conversation.name}</strong>
        <div className="muted small chat-header-status">
          <TypingIndicator conversationId={conversation.id} />{' '}
          {conversation.type === 'direct' && conversation.otherUser && <PresenceText userId={conversation.otherUser.id} />}
        </div>
      </div>
    </header>
  );
}
