import { useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext.jsx';

// Subscribes a component to one Socket.IO event and unsubscribes on unmount.
// Feature components use this so they do not need to edit shared files.
export function useSocketEvent(event, handler) {
  const { socket } = useAuth();
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    if (!socket) return undefined;
    const listener = (...args) => handlerRef.current(...args);
    socket.on(event, listener);
    return () => socket.off(event, listener);
  }, [socket, event]);
}
