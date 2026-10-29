import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { http } from '../api/http.js';
import { useAuth } from './AuthContext.jsx';
import { newClientMsgId } from '../utils/ids.js';
import { useSocketEvent } from '../hooks/useSocketEvent.js';

const ChatContext = createContext(null);
const STATUS_RANK = { pending: -1, sent: 0, delivered: 1, read: 2, deleted: 3 };

// State of the chat dashboard: the conversation that is open and the
// messages loaded for each conversation (keyed by conversation id).
export function ChatProvider({ children }) {
  const { socket, user } = useAuth();
  const [activeConversation, setActiveConversation] = useState(null);
  const [messagesByConv, setMessagesByConv] = useState({});
  // REQ-HIS-3: message to scroll to and highlight after a search result is clicked.
  const [focusedMessageId, setFocusedMessageId] = useState(null);
  const focusMessage = useCallback((id) => setFocusedMessageId(id), []);

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
  // REQ-RCP-2: acknowledge receipt so the sender's tick becomes "delivered".
  useSocketEvent('message:new', (message) => {
    upsertMessages(message.conversationId, [message]);
    if (socket && message.id && message.senderId && message.senderId !== user?.id) {
      socket.emit('message:delivered', { messageId: message.id });
    }
  });

  // REQ-MSG-8: a message was deleted by its sender.
  useSocketEvent('message:deleted', ({ messageId, conversationId }) => {
    upsertMessages(conversationId, [{ id: messageId, status: 'deleted', content: null, attachment: null }]);
  });

  const deleteMessage = useCallback(
    async (message) => {
      if (!socket) return;
      const ack = await socket.timeout(10000).emitWithAck('message:delete', { messageId: message.id });
      if (ack.ok) upsertMessages(message.conversationId, [{ id: message.id, status: 'deleted', content: null, attachment: null }]);
    },
    [socket, upsertMessages]
  );

  // REQ-RCP-4: tick changes pushed by the server (never moves backwards).
  useSocketEvent('receipt:update', ({ messageId, conversationId, status }) => {
    const current = (messagesByConv[conversationId] || []).find((m) => m.id === messageId);
    // Ignore messages that are not loaded, and any backward move.
    if (!current || STATUS_RANK[status] <= (STATUS_RANK[current.status] ?? -1)) return;
    upsertMessages(conversationId, [{ id: messageId, status }]);
  });

  // REQ-RCP-3: while a conversation is open and the window is visible, tell the
  // server that the messages on screen were read (again whenever new ones arrive).
  const activeId = activeConversation?.id;
  const activeList = activeId ? messagesByConv[activeId] : null;
  const unreadFromOthers = (activeList || []).filter(
    (m) => m.id && m.senderId && m.senderId !== user?.id && !(m.readBy || []).some((r) => r.userId === user?.id)
  ).length;
  useEffect(() => {
    if (!socket || !activeId) return undefined;
    const report = () => {
      if (document.visibilityState === 'visible') socket.emit('message:read', { conversationId: activeId });
    };
    report();
    document.addEventListener('visibilitychange', report);
    return () => document.removeEventListener('visibilitychange', report);
  }, [socket, activeId, unreadFromOthers]);

  // Opens (or creates) the one-to-one conversation with a contact.
  const startDirectChat = useCallback(async (user) => {
    const { data } = await http.post('/conversations/direct', { userId: user.id });
    setActiveConversation(data);
    return data;
  }, []);

  // REQ-MSG-1 / REQ-MSG-7: messages go through an outbox. Each one keeps its
  // clientMsgId until the server acknowledges it; after a connection loss
  // everything still in the outbox is sent again (the server drops duplicates).
  const outbox = useRef(new Map());

  const deliver = useCallback(
    async (payload) => {
      if (!socket || !socket.connected) return; // will be sent on reconnect
      try {
        const ack = await socket.timeout(10000).emitWithAck('message:send', payload);
        outbox.current.delete(payload.clientMsgId);
        if (ack.ok) upsertMessages(payload.conversationId, [{ ...ack.message, mine: true }]);
        else upsertMessages(payload.conversationId, [{ clientMsgId: payload.clientMsgId, status: 'failed', error: ack.error.message }]);
      } catch {
        // No answer (connection dropped): keep it in the outbox as "pending".
      }
    },
    [socket, upsertMessages]
  );

  useEffect(() => {
    if (!socket) return undefined;
    const flush = () => outbox.current.forEach((payload) => deliver(payload));
    socket.on('connect', flush);
    return () => socket.off('connect', flush);
  }, [socket, deliver]);

  const sendMessage = useCallback(
    async (text, attachment = null) => {
      if (!activeConversation) return;
      const conversationId = activeConversation.id;
      const clientMsgId = newClientMsgId();
      upsertMessages(conversationId, [
        { clientMsgId, conversationId, content: text, attachment, mine: true, status: 'pending', sentAt: new Date().toISOString() },
      ]);
      const payload = { conversationId, content: text, clientMsgId };
      if (attachment) payload.attachmentId = attachment.attachmentId || attachment.id;
      outbox.current.set(clientMsgId, payload);
      await deliver(payload);
    },
    [activeConversation, upsertMessages, deliver]
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
      deleteMessage,
      focusedMessageId,
      focusMessage,
    }),
    [activeConversation, openConversation, closeConversation, messagesByConv, upsertMessages, sendMessage, startDirectChat, deleteMessage, focusedMessageId, focusMessage]
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
