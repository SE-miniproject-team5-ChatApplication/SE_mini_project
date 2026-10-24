import { useEffect, useRef } from 'react';
import { useChat } from '../context/ChatContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import MessageBubble from './MessageBubble.jsx';

// Scrollable history. Keeps the view pinned to the newest message.
export default function MessageList() {
  const { messages } = useChat();
  const { user } = useAuth();
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [messages.length]);

  return (
    <div className="message-list">
      {messages.length === 0 && <p className="muted empty-hint">No messages yet. Say hello!</p>}
      {messages.map((m) => (
        <MessageBubble key={m.clientMsgId || m.id} message={m} mine={m.mine || m.senderId === user?.id} />
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
