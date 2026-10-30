
import { useEffect, useState } from 'react';
import { useConversations } from '../context/ConversationsContext.jsx';
import { useChat } from '../context/ChatContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useSocketEvent } from '../hooks/useSocketEvent.js';
import { formatDateTime } from '../utils/format.js';
import PresenceDot from './PresenceDot.jsx';

function getBrowserNotificationPermission() {
  if (
    typeof window === 'undefined' ||
    !('Notification' in window)
  ) {
    return 'unsupported';
  }

  return window.Notification.permission;
}

export default function ConversationList() {
  const { conversations, refresh } = useConversations();
  const { activeConversation, openConversation } = useChat();
  const { user } = useAuth();

  const [notification, setNotification] = useState('');
  const [notificationId, setNotificationId] = useState(0);
  const [browserPermission, setBrowserPermission] = useState(
    getBrowserNotificationPermission
  );

  // Ask the browser for notification permission after a user clicks the button.
  async function enableBrowserNotifications() {
    if (
      typeof window === 'undefined' ||
      !('Notification' in window)
    ) {
      setBrowserPermission('unsupported');
      return;
    }

    try {
      const permission = await window.Notification.requestPermission();
      setBrowserPermission(permission);
    } catch (error) {
      console.error('Could not request browser notification permission:', error);
      setBrowserPermission(getBrowserNotificationPermission());
    }
  }

  // Refresh permission status when the user returns to this browser tab.
  useEffect(() => {
    function updatePermission() {
      setBrowserPermission(getBrowserNotificationPermission());
    }

    window.addEventListener('focus', updatePermission);

    return () => {
      window.removeEventListener('focus', updatePermission);
    };
  }, []);

  // Refresh after opening a conversation so its unread badge resets.
  useEffect(() => {
    if (!activeConversation?.id) return undefined;

    const timer = setTimeout(() => {
      refresh().catch(() => {});
    }, 300);

    return () => clearTimeout(timer);
  }, [activeConversation?.id, refresh]);

  // REQ-NOT-2: show an in-app notification and, when permission
  // is granted, a browser notification for incoming messages
  // in conversations that are not currently open.
  useSocketEvent('message:new', (message) => {
    if (!message || !user?.id) return;
    if (String(message.senderId) === String(user.id)) return;

    if (
      String(message.conversationId) ===
      String(activeConversation?.id)
    ) {
      return;
    }

    const conversation = conversations.find(
      (item) => String(item.id) === String(message.conversationId)
    );

    const conversationName = conversation?.name || 'New conversation';
    const messageText = message.content || 'Sent an attachment';
    const notificationText = `${conversationName}: ${messageText}`;

    // Existing in-app notification.
    setNotification(notificationText);
    setNotificationId((previous) => previous + 1);

    // Browser notification, only when the user has granted permission.
    if (
      typeof window !== 'undefined' &&
      'Notification' in window &&
      window.Notification.permission === 'granted'
    ) {
      try {
        const browserNotification = new window.Notification(
          'New message',
          {
            body: notificationText,
          }
        );

        browserNotification.onclick = () => {
          window.focus();
          browserNotification.close();

          if (conversation) {
            openConversation(conversation);
          }
        };
      } catch (error) {
        console.error('Could not display browser notification:', error);
      }
    }
  });

  // Automatically dismiss the in-app notification after five seconds.
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
      !conversations.some(
        (conversation) => conversation.id === activeConversation.id
      )
    ) {
      refresh().catch(() => {});
    }
  }, [activeConversation, conversations, refresh]);

  return (
    <div className="sidebar-section">
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '8px',
          flexWrap: 'wrap',
        }}
      >
        <h2>Chats</h2>

        {browserPermission === 'default' && (
          <button
            type="button"
            onClick={enableBrowserNotifications}
            style={{
              padding: '6px 9px',
              borderRadius: '5px',
              border: '1px solid #1f6feb',
              background: '#ffffff',
              color: '#1f6feb',
              cursor: 'pointer',
              fontSize: '12px',
            }}
          >
            Enable browser notifications
          </button>
        )}

        {browserPermission === 'granted' && (
          <span
            style={{
              color: '#16803c',
              fontSize: '12px',
            }}
            role="status"
          >
            Browser notifications enabled
          </span>
        )}

        {browserPermission === 'denied' && (
          <span
            style={{
              color: '#b54708',
              fontSize: '12px',
            }}
            role="status"
            title="Change notification permission in your browser site settings."
          >
            Browser notifications blocked
          </span>
        )}

        {browserPermission === 'unsupported' && (
          <span
            className="muted small"
            role="status"
          >
            Browser notifications unavailable
          </span>
        )}
      </div>

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
