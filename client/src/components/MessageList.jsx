import { useEffect, useLayoutEffect, useRef } from 'react';
import { useChat } from '../context/ChatContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useHistory } from '../hooks/useHistory.js';
import MessageBubble from './MessageBubble.jsx';

// Scrollable history. New messages keep the view pinned to the bottom;
// scrolling to the top loads older messages without jumping (REQ-HIS-2).
export default function MessageList() {
  const { messages, activeConversation } = useChat();
  const { user } = useAuth();
  const { loading, hasMore, loadOlder } = useHistory(activeConversation?.id);
  const boxRef = useRef(null);
  const bottomRef = useRef(null);
  const restore = useRef(null);
  const lastKey = messages.length ? messages[messages.length - 1].clientMsgId || messages[messages.length - 1].id : null;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [lastKey, activeConversation?.id]);

  // After older messages are added on top, keep the same message under the eyes.
  useLayoutEffect(() => {
    if (restore.current !== null && boxRef.current) {
      boxRef.current.scrollTop = boxRef.current.scrollHeight - restore.current;
      restore.current = null;
    }
  }, [messages.length]);

  const onScroll = async (e) => {
    if (e.currentTarget.scrollTop > 40 || !hasMore || loading) return;
    const box = e.currentTarget;
    restore.current = box.scrollHeight - box.scrollTop;
    const added = await loadOlder();
    if (!added) restore.current = null;
  };

  return (
    <div className="message-list" ref={boxRef} onScroll={onScroll}>
      {loading && <p className="muted small empty-hint">Loading…</p>}
      {!loading && messages.length === 0 && <p className="muted empty-hint">No messages yet. Say hello!</p>}
      {messages.map((m) => (
        <MessageBubble key={m.clientMsgId || m.id} message={m} mine={m.mine || m.senderId === user?.id} />
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
