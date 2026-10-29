import { useEffect, useRef, useState } from 'react';
import { useSocketEvent } from '../hooks/useSocketEvent.js';

// Shows "typing…" for the open conversation (REQ-PRS-3). Each entry also
// expires on its own in case the "stop" event is lost.
export default function TypingIndicator({ conversationId, nameOf }) {
  const [typing, setTyping] = useState({});
  const timers = useRef({});

  useEffect(() => {
    const all = timers.current;
    setTyping({});
    return () => Object.values(all).forEach(clearTimeout);
  }, [conversationId]);

  useSocketEvent('typing:update', (u) => {
    if (u.conversationId !== conversationId) return;
    clearTimeout(timers.current[u.userId]);
    if (u.typing) {
      timers.current[u.userId] = setTimeout(() => setTyping((t) => ({ ...t, [u.userId]: false })), 4000);
    }
    setTyping((t) => ({ ...t, [u.userId]: u.typing }));
  });

  const who = Object.keys(typing).filter((id) => typing[id]);
  if (who.length === 0) return null;
  const names = nameOf ? who.map(nameOf).filter(Boolean) : [];
  return <span className="typing">{names.length ? `${names.join(', ')} ${names.length > 1 ? 'are' : 'is'} typing…` : 'typing…'}</span>;
}
