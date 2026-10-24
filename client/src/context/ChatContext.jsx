
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { http } from '../api/http.js';
import { useAuth } from './AuthContext.jsx';
import { newClientMsgId } from '../utils/ids.js';
import { useSocketEvent } from '../hooks/useSocketEvent.js';

const ChatContext = createContext(null);

const MESSAGE_PAGE_SIZE = 50;

export function ChatProvider({ children }) {
  const { socket } = useAuth();

  const [activeConversation, setActiveConversation] = useState(null);
  const [messagesByConv, setMessagesByConv] = useState({});
  const [historyStateByConv, setHistoryStateByConv] = useState({});

  // Track the active conversation without relying on stale callback values.
  const activeConversationRef = useRef(null);

  useEffect(() => {
    activeConversationRef.current = activeConversation;
  }, [activeConversation]);

  const upsertMessages = useCallback((conversationId, incoming) => {
    setMessagesByConv((prev) => {
      const list = prev[conversationId]
        ? [...prev[conversationId]]
        : [];

      for (const msg of incoming) {
        const idx = list.findIndex(
          (m) =>
            (msg.id && m.id === msg.id) ||
            (msg.clientMsgId && m.clientMsgId === msg.clientMsgId)
        );

        if (idx >= 0) {
          list[idx] = { ...list[idx], ...msg };
        } else {
          list.push(msg);
        }
      }

      list.sort(compareMessages);
      return { ...prev, [conversationId]: list };
    });
  }, []);

  // Load the latest page when a conversation is opened.
  const loadLatestMessages = useCallback(
    async (conversationId, force = false) => {
      const existing = historyStateByConv[conversationId];

      if (!force && existing?.initialized) return;
      if (existing?.loadingLatest) return;

      setHistoryStateByConv((prev) => ({
        ...prev,
        [conversationId]: {
          ...prev[conversationId],
          loadingLatest: true,
          error: null,
        },
      }));

      try {
        const { data } = await http.get(
          `/conversations/${conversationId}/messages`,
          { params: { limit: MESSAGE_PAGE_SIZE } }
        );

        upsertMessages(conversationId, data.messages || []);

        setHistoryStateByConv((prev) => ({
          ...prev,
          [conversationId]: {
            ...prev[conversationId],
            initialized: true,
            loadingLatest: false,
            loadingOlder: false,
            hasMore: Boolean(data.hasMore),
            nextBefore: data.nextBefore || null,
            error: null,
          },
        }));
      } catch (error) {
        setHistoryStateByConv((prev) => ({
          ...prev,
          [conversationId]: {
            ...prev[conversationId],
            loadingLatest: false,
            error: error.response?.data?.message || 'Could not load messages',
          },
        }));
      }
    },
    [historyStateByConv, upsertMessages]
  );

  // Load the next page of older messages.
  const loadOlderMessages = useCallback(
    async (conversationId) => {
      const state = historyStateByConv[conversationId];

      if (
        !state?.initialized ||
        !state.hasMore ||
        !state.nextBefore ||
        state.loadingOlder ||
        state.loadingLatest
      ) {
        return;
      }

      setHistoryStateByConv((prev) => ({
        ...prev,
        [conversationId]: {
          ...prev[conversationId],
          loadingOlder: true,
          error: null,
        },
      }));

      try {
        const { data } = await http.get(
          `/conversations/${conversationId}/messages`,
          { params: { before: state.nextBefore, limit: MESSAGE_PAGE_SIZE } }
        );

        upsertMessages(conversationId, data.messages || []);

        setHistoryStateByConv((prev) => ({
          ...prev,
          [conversationId]: {
            ...prev[conversationId],
            loadingOlder: false,
            hasMore: Boolean(data.hasMore),
            nextBefore: data.nextBefore || null,
            error: null,
          },
        }));
      } catch (error) {
        setHistoryStateByConv((prev) => ({
          ...prev,
          [conversationId]: {
            ...prev[conversationId],
            loadingOlder: false,
            error: error.response?.data?.message || 'Could not load older messages',
          },
        }));
      }
    },
    [historyStateByConv, upsertMessages]
  );

  const openConversation = useCallback((conversation) => {
    setActiveConversation(conversation);
  }, []);

  const closeConversation = useCallback(() => {
    setActiveConversation(null);
  }, []);

  useEffect(() => {
    if (activeConversation?.id) {
      loadLatestMessages(activeConversation.id);
    }
  }, [activeConversation?.id, loadLatestMessages]);

  // Messages pushed by the server in real time.
  useSocketEvent('message:new', (message) => {
    upsertMessages(message.conversationId, [message]);
  });

  // Opens or creates a one-to-one conversation with a contact.
  const startDirectChat = useCallback(async (user) => {
    const { data } = await http.post('/conversations/direct', {
      userId: user.id,
    });
    setActiveConversation(data);
    return data;
  }, []);

  // Send over WebSocket; show the message immediately as pending.
  const sendMessage = useCallback(
    async (text) => {
      if (!activeConversation || !socket) return;

      const conversationId = activeConversation.id;
      const clientMsgId = newClientMsgId();

      upsertMessages(conversationId, [
        {
          clientMsgId,
          conversationId,
          content: text,
          mine: true,
          status: 'pending',
          sentAt: new Date().toISOString(),
        },
      ]);

      try {
        const ack = await socket.timeout(10000).emitWithAck('message:send', {
          conversationId,
          content: text,
          clientMsgId,
        });

        if (ack.ok) {
          upsertMessages(conversationId, [{ ...ack.message, mine: true }]);
        } else {
          upsertMessages(conversationId, [
            {
              clientMsgId,
              status: 'failed',
              error: ack.error.message,
            },
          ]);
        }
      } catch {
        upsertMessages(conversationId, [
          {
            clientMsgId,
            status: 'failed',
            error: 'No response from server',
          },
        ]);
      }
    },
    [activeConversation, socket, upsertMessages]
  );

  const activeId = activeConversation?.id;
  const historyState = activeId
    ? historyStateByConv[activeId] || {}
    : {};

  const value = useMemo(
    () => ({
      activeConversation,
      openConversation,
      closeConversation,
      messages: activeId ? messagesByConv[activeId] || [] : [],
      messagesByConv,
      upsertMessages,
      sendMessage,
      startDirectChat,
      loadLatestMessages,
      loadOlderMessages,
      isLoadingMessages: Boolean(historyState.loadingLatest),
      isLoadingOlderMessages: Boolean(historyState.loadingOlder),
      hasMoreMessages: Boolean(historyState.hasMore),
      messageHistoryError: historyState.error || null,
    }),
    [
      activeConversation,
      activeId,
      messagesByConv,
      upsertMessages,
      sendMessage,
      startDirectChat,
      openConversation,
      closeConversation,
      loadLatestMessages,
      loadOlderMessages,
      historyState.loadingLatest,
      historyState.loadingOlder,
      historyState.hasMore,
      historyState.error,
    ]
  );

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
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
