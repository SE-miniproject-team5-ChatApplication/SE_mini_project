import { useCallback, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext.jsx';

const RESEND_MS = 2000; // keep the indicator alive while typing continues
const IDLE_MS = 3000; // REQ-PRS-3: remove after 3 s without keystrokes

// Tells the server when the user starts and stops typing in a conversation.
// The first keystroke is sent at once, so others see it within 300 ms.
export function useTypingEmitter(conversationId) {
  const { socket } = useAuth();
  const lastSent = useRef(0);
  const idleTimer = useRef(null);

  const stop = useCallback(() => {
    clearTimeout(idleTimer.current);
    if (lastSent.current && socket && conversationId) socket.emit('typing:stop', { conversationId });
    lastSent.current = 0;
  }, [socket, conversationId]);

  const onKeystroke = useCallback(() => {
    if (!socket || !conversationId) return;
    const now = Date.now();
    if (now - lastSent.current > RESEND_MS) {
      socket.emit('typing:start', { conversationId });
      lastSent.current = now;
    }
    clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(stop, IDLE_MS);
  }, [socket, conversationId, stop]);

  useEffect(() => stop, [stop]); // stop when switching conversation or leaving

  return { onKeystroke, stop };
}
