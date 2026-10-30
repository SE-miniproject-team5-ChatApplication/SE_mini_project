
import { useEffect, useState } from 'react';
import { useConversations } from '../context/ConversationsContext.jsx';
import { useChat } from '../context/ChatContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useSocketEvent } from '../hooks/useSocketEvent.js';
import { formatDateTime } from '../utils/format.js';
import PresenceDot from './PresenceDot.jsx';

export default function ConversationList() {
  const { conversations, refresh } = useConversations();
  const { activeConversation, openConversation } = useChat();
  const { user } = useAuth();

  const [notification, setNotification] = useState('');
  const [notificationId, setNotificationId] = useState(0);

  // Refresh after opening a conversation so its unread badge resets.
  useEffect(() => {
    if (!activeConversation?.id) return undefined;

    const timer = setTimeout(() => {
      refresh().catch(() => {});
    }, 300);

    return () => clearTimeout(timer);
  }, [activeConversation?.id, refresh]);

  // REQ-NOT-1: show a notification for incoming messages
  // in conversations that are not currently open.
  useSocketEvent('message:new', (message) => {
    if (!message || !user?.id) return;
    if (String(message.senderId) === String(user.id)) return;
    if (String(message.conversationId) === String(activeConversation?.id)) return;

    const conversation = conversations.find(
      (item) => String(item.id) === String(message.conversationId)
    );

    const conversationName = conversation?.name || 'New conversation';
    const messageText = message.content || 'Sent an attachment';

    setNotification(`${conversationName}: ${messageText}`);
    setNotificationId((previous) => previous + 1);
  });

  // Automatically dismiss the notification after five seconds.
  useEffect(() => {
    if (!notification) return undefined;

    const timer = setTimeout(() => {
      setNotification('');
    }, 5000);

    return () => clearTimeout(timer);
  }, [notification, notificationId]);

  // A chat opened from the contact list may be new.
  useEffect(() => {
    if (
      activeConversation &&
      !conversations.some((c) => c.id === activeConversation.id)
    ) {
      refresh().catch(() => {});
    }
  }, [activeConversation, conversations, refresh]);

  return (
    <div className="sidebar-section">
      <h2>Chats</h2>

      {notification && (
        <div
          role="status"
          aria-live="polite"
          style={{
            padding: '9px 11px',
            marginBottom: '10px',
            borderRadius: '6px',
            background: '#e8f1ff',
            border: '1px solid #9bbcf0',
            color: '#174ea6',
            fontSize: '14px',
            overflowWrap: 'anywhere',
          }}
        >
          <strong>New message</strong>
          <div>{notification}</div>
        </div>
      )}

      {conversations.length === 0 && (
        <div className="muted small">No conversations yet.</div>
      )}

      <ul className="plain-list">
        {conversations.map((c) => {
          const mine = c.lastMessage?.senderId === user?.id;
          const unread = Number(c.unread) || 0;

          return (
            <li key={c.id}>
              <button
                type="button"
                className={`conversation-row ${
                  activeConversation?.id === c.id ? 'active' : ''
                }`}
                onClick={() => openConversation(c)}
              >
                <span className="conversation-main">
                  <span className="conversation-name">
                    {c.type === 'direct' && c.otherUser && (
                      <PresenceDot userId={c.otherUser.id} />
                    )}{' '}
                    {c.name}
                  </span>

                  <span className="muted small conversation-preview">
                    {c.lastMessage
                      ? `${mine ? 'You: ' : ''}${c.lastMessage.preview}`
                      : 'No messages yet'}
                  </span>
                </span>

                <span className="conversation-side">
                  <span className="muted small">
                    {formatDateTime(c.lastMessage?.sentAt)}
                  </span>

                  {unread > 0 && (
                    <span
                      className="unread-badge"
                      aria-label={`${unread} unread messages`}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minWidth: '21px',
                        height: '21px',
                        padding: '0 6px',
                        borderRadius: '12px',
                        background: '#1f6feb',
                        color: '#ffffff',
                        fontSize: '12px',
                        fontWeight: 700,
                      }}
                    >
                      {unread > 99 ? '99+' : unread}
                    </span>
                  )}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
