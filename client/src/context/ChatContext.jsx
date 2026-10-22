import { createContext, useCallback, useContext, useMemo, useState } from 'react';

const ChatContext = createContext(null);

// State of the chat dashboard: the conversation that is open and the
// messages loaded for each conversation (keyed by conversation id).
export function ChatProvider({ children }) {
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

  // Placeholder: shows the message locally. REQ-MSG-1 sends it to the server.
  const sendMessage = useCallback(
    (text) => {
      if (!activeConversation) return;
      upsertMessages(activeConversation.id, [
        { clientMsgId: `${Date.now()}`, content: text, mine: true, status: 'pending', sentAt: new Date().toISOString() },
      ]);
    },
    [activeConversation, upsertMessages]
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
    }),
    [activeConversation, openConversation, closeConversation, messagesByConv, upsertMessages, sendMessage]
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
