import { useEffect } from 'react';
import { useConversations } from '../context/ConversationsContext.jsx';
import { useChat } from '../context/ChatContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { formatDateTime } from '../utils/format.js';
import PresenceDot from './PresenceDot.jsx';

// REQ-HIS-1: conversations ordered by most recent activity with a preview.
export default function ConversationList() {
  const { conversations, refresh } = useConversations();
  const { activeConversation, openConversation } = useChat();
  const { user } = useAuth();

  // A chat opened from the contact list may be new - reload to show it.
  useEffect(() => {
    if (activeConversation && !conversations.some((c) => c.id === activeConversation.id)) refresh().catch(() => {});
  }, [activeConversation, conversations, refresh]);

  return (
    <div className="sidebar-section">
      <h2>Chats</h2>
      {conversations.length === 0 && <div className="muted small">No conversations yet.</div>}
      <ul className="plain-list">
        {conversations.map((c) => {
          const mine = c.lastMessage?.senderId === user?.id;
          return (
            <li key={c.id}>
              <button
                type="button"
                className={`conversation-row ${activeConversation?.id === c.id ? 'active' : ''}`}
                onClick={() => openConversation(c)}
              >
                <span className="conversation-main">
                  <span className="conversation-name">
                    {c.type === 'direct' && c.otherUser && <PresenceDot userId={c.otherUser.id} />} {c.name}
                  </span>
                  <span className="muted small conversation-preview">
                    {c.lastMessage ? `${mine ? 'You: ' : ''}${c.lastMessage.preview}` : 'No messages yet'}
                  </span>
                </span>
                <span className="conversation-side">
                  <span className="muted small">{formatDateTime(c.lastMessage?.sentAt)}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
