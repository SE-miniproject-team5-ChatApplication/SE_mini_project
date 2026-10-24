import { useEffect } from 'react';
import { usePresence } from '../context/PresenceContext.jsx';

// Green dot when the user is online (SRS 3.1 presence dots).
export default function PresenceDot({ userId }) {
  const { presence, track } = usePresence();
  useEffect(() => {
    track([userId]);
  }, [userId, track]);
  const online = presence[userId]?.status === 'online';
  return <span className={`presence-dot ${online ? 'online' : ''}`} title={online ? 'Online' : 'Offline'} aria-label={online ? 'Online' : 'Offline'} />;
}
