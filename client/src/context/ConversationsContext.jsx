
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
import { useSocketEvent } from '../hooks/useSocketEvent.js';

const ConversationsContext = createContext(null);

// REQ-HIS-1 and REQ-NOT-1:
// Keep conversation previews, ordering and unread counts up to date.
export function ConversationsProvider({ children }) {
  const [conversations, setConversations] = useState([]);
  const timer = useRef(null);

  const refresh = useCallback(async () => {
    const { data } = await http.get('/conversations');
    setConversations(data);
  }, []);

  const scheduleRefresh = useCallback(() => {
    clearTimeout(timer.current);

    timer.current = setTimeout(() => {
      refresh().catch(() => {});
    }, 250);
  }, [refresh]);

  useEffect(() => {
    refresh().catch(() => {});

    return () => {
      clearTimeout(timer.current);
    };
  }, [refresh]);

  // Refresh when a new message arrives so unread counts and previews update.
  useSocketEvent('message:new', scheduleRefresh);

  // Refresh after sending or acknowledging a message.
  useSocketEvent('message:ack', scheduleRefresh);

  // Refresh after group creation, rename or membership changes.
  useSocketEvent('group:update', scheduleRefresh);

  // Refresh after read receipts so the conversation list reflects the reset.
  useSocketEvent('message:read', scheduleRefresh);

  const value = useMemo(
    () => ({
      conversations,
      refresh,
      scheduleRefresh,
    }),
    [conversations, refresh, scheduleRefresh]
  );

  return (
    <ConversationsContext.Provider value={value}>
      {children}
    </ConversationsContext.Provider>
  );
}

export function useConversations() {
  const ctx = useContext(ConversationsContext);

  if (!ctx) {
    throw new Error(
      'useConversations must be used inside ConversationsProvider'
    );
  }

  return ctx;
}
