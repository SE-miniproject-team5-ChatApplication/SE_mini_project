import { useEffect } from 'react';
import { usePresence } from '../context/PresenceContext.jsx';
import { formatDateTime } from '../utils/format.js';

// "online" or "last seen 10:42" under a contact's name (REQ-PRS-1, REQ-PRS-2).
export default function PresenceText({ userId }) {
  const { presence, track } = usePresence();
  useEffect(() => {
    track([userId]);
  }, [userId, track]);
  const p = presence[userId];
  if (!p) return null;
  if (p.status === 'online') return <span>online</span>;
  return <span>{p.lastSeen ? `last seen ${formatDateTime(p.lastSeen)}` : 'offline'}</span>;
}
