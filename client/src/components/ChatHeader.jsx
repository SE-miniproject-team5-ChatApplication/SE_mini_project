import { useState } from 'react';
import { useChat } from '../context/ChatContext.jsx';
import PresenceText from './PresenceText.jsx';
import TypingIndicator from './TypingIndicator.jsx';
import GroupInfoDialog from './GroupInfoDialog.jsx';

export default function ChatHeader({ conversation }) {
  const { closeConversation } = useChat();
  const [showInfo, setShowInfo] = useState(false);
  const isGroup = conversation.type === 'group';
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
      {isGroup && (
        <button type="button" className="btn btn-small btn-secondary" onClick={() => setShowInfo(true)}>
          Group info
        </button>
      )}
      {isGroup && showInfo && <GroupInfoDialog groupId={conversation.id} onClose={() => setShowInfo(false)} />}
    </header>
  );
}
