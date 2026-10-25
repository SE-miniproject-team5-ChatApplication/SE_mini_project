import { useCallback, useEffect, useRef, useState } from 'react';
import { http } from '../api/http.js';
import { useChat } from '../context/ChatContext.jsx';

// REQ-HIS-2: loads the latest 50 messages when a conversation is opened and
// 50 older ones each time loadOlder() is called (user scrolled to the top).
export function useHistory(conversationId) {
  const { messagesByConv, upsertMessages } = useChat();
  const meta = useRef({}); // conversationId -> { hasMore, loaded }
  const [loading, setLoading] = useState(false);
  const [, rerender] = useState(0);

  useEffect(() => {
    if (!conversationId || meta.current[conversationId]?.loaded) return;
    let cancelled = false;
    setLoading(true);
    http
      .get(`/conversations/${conversationId}/messages`)
      .then(({ data }) => {
        if (cancelled) return;
        meta.current[conversationId] = { hasMore: data.hasMore, loaded: true };
        upsertMessages(conversationId, data.messages);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [conversationId, upsertMessages]);

  const loadOlder = useCallback(async () => {
    const info = meta.current[conversationId];
    const list = messagesByConv[conversationId] || [];
    const oldest = list.find((m) => m.id);
    if (!info?.hasMore || loading || !oldest) return false;
    setLoading(true);
    try {
      const { data } = await http.get(`/conversations/${conversationId}/messages`, { params: { before: oldest.id } });
      meta.current[conversationId] = { ...info, hasMore: data.hasMore };
      upsertMessages(conversationId, data.messages);
      rerender((n) => n + 1);
      return data.messages.length > 0;
    } finally {
      setLoading(false);
    }
  }, [conversationId, messagesByConv, upsertMessages, loading]);

  return { loading, hasMore: Boolean(meta.current[conversationId]?.hasMore), loadOlder };
}
