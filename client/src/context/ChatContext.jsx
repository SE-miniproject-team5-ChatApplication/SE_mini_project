import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { http } from '../api/http.js';
import { useAuth } from './AuthContext.jsx';
import { newClientMsgId } from '../utils/ids.js';
import { useSocketEvent } from '../hooks/useSocketEvent.js';

const ChatContext = createContext(null);

// State of the chat dashboard: the conversation that is open and the
// messages loaded for each conversation (keyed by conversation id).
export function ChatProvider({ children }) {
  const { socket } = useAuth();
  const [activeConversation, setActiveConversation] = useState(null);
  const [messagesByConv, setMessagesByConv] = useState({});

  const openConversation = useCallback((conversation) => {
    setActiveConversation(conversation);
  }, []);

  const closeConversation = useCallback(() => setActiveConversation(null), []);

  // Adds or updates messages, keeping one copy per id and sorted by server time.
  const upsertMessages = useCallback((conversationId, incoming) => {
    setMessagesByConv((prev) => {
      const list = prev[conversationId] ? [...prev[conversationId]] : [];
      for (const msg of incoming) {
        const idx = list.findIndex(
          (m) => (msg.id && m.id === msg.id) || (msg.clientMsgId && m.clientMsgId === msg.clientMsgId)
        );
        if (idx >= 0) list[idx] = { ...list[idx], ...msg };
        else list.push(msg);
      }
      list.sort(compareMessages);
      return { ...prev, [conversationId]: list };
    });
  }, []);

  // REQ-MSG-2: messages pushed by the server in real time.
  useSocketEvent('message:new', (message) => {
    upsertMessages(message.conversationId, [message]);
  });

  // Opens (or creates) the one-to-one conversation with a contact.
  const startDirectChat = useCallback(async (user) => {
    const { data } = await http.post('/conversations/direct', { userId: user.id });
    setActiveConversation(data);
    return data;
  }, []);

  // REQ-MSG-1: send over the WebSocket. The message is shown at once as
  // "pending" and replaced by the stored copy when the server acknowledges it.
  const sendMessage = useCallback(
    async (text, attachment = null) => {
      if (!activeConversation || !socket) return;
      const conversationId = activeConversation.id;
      const clientMsgId = newClientMsgId();
      upsertMessages(conversationId, [
        { clientMsgId, conversationId, content: text, attachment, mine: true, status: 'pending', sentAt: new Date().toISOString() },
      ]);
      try {
        const payload = { conversationId, content: text, clientMsgId };
        if (attachment) payload.attachmentId = attachment.attachmentId || attachment.id;
        const ack = await socket.timeout(10000).emitWithAck('message:send', payload);
        if (ack.ok) upsertMessages(conversationId, [{ ...ack.message, mine: true }]);
        else upsertMessages(conversationId, [{ clientMsgId, status: 'failed', error: ack.error.message }]);
      } catch {
        upsertMessages(conversationId, [{ clientMsgId, status: 'failed', error: 'No response from server' }]);
      }
    },
    [activeConversation, socket, upsertMessages]
  );

  const value = useMemo(
    () => ({
      activeConversation,
      openConversation,
      closeConversation,
      messages: activeConversation ? messagesByConv[activeConversation.id] || [] : [],
      messagesByConv,
      upsertMessages,
      sendMessage,
      startDirectChat,
    }),
    [activeConversation, openConversation, closeConversation, messagesByConv, upsertMessages, sendMessage, startDirectChat]
  );
  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function compareMessages(a, b) {
  const t = new Date(a.sentAt) - new Date(b.sentAt);
  if (t !== 0) return t;
  return String(a.id || '').localeCompare(String(b.id || ''));
}

export function useChat() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error('useChat must be used inside ChatProvider');
  return ctx;
}
