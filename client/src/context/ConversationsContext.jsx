import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { http } from '../api/http.js';
import { useSocketEvent } from '../hooks/useSocketEvent.js';

const ConversationsContext = createContext(null);

// REQ-HIS-1: the conversation list in the sidebar. It is reloaded shortly after
// any message activity so the order, previews (and unread counts) stay current.
export function ConversationsProvider({ children }) {
  const [conversations, setConversations] = useState([]);
  const timer = useRef(null);

  const refresh = useCallback(async () => {
    const { data } = await http.get('/conversations');
    setConversations(data);
  }, []);

  const scheduleRefresh = useCallback(() => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => refresh().catch(() => {}), 250);
  }, [refresh]);

  useEffect(() => {
    refresh().catch(() => {});
    return () => clearTimeout(timer.current);
  }, [refresh]);

  useSocketEvent('message:new', scheduleRefresh);
  useSocketEvent('message:ack', scheduleRefresh);

  const value = useMemo(() => ({ conversations, refresh, scheduleRefresh }), [conversations, refresh, scheduleRefresh]);
  return <ConversationsContext.Provider value={value}>{children}</ConversationsContext.Provider>;
}

export function useConversations() {
  const ctx = useContext(ConversationsContext);
  if (!ctx) throw new Error('useConversations must be used inside ConversationsProvider');
  return ctx;
}
