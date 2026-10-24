import { useEffect } from 'react';
import { usePresence } from '../context/PresenceContext.jsx';

// "online" / "offline" line under a contact's name in the chat header.
export default function PresenceText({ userId }) {
  const { presence, track } = usePresence();
  useEffect(() => {
    track([userId]);
  }, [userId, track]);
  const p = presence[userId];
  if (!p) return null;
  return <span>{p.status === 'online' ? 'online' : 'offline'}</span>;
}
