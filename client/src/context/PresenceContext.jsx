import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { http } from '../api/http.js';
import { useSocketEvent } from '../hooks/useSocketEvent.js';

const PresenceContext = createContext(null);

// Online/offline state of other users (REQ-PRS-1). Components call track(ids)
// for the users they show; later changes arrive as presence:update events.
export function PresenceProvider({ children }) {
  const [presence, setPresence] = useState({});
  const requested = useRef(new Set());

  useSocketEvent('presence:update', (update) => {
    setPresence((prev) => ({ ...prev, [update.userId]: { ...prev[update.userId], ...update } }));
  });

  const track = useCallback(async (ids) => {
    const fresh = ids.filter((id) => id && !requested.current.has(id));
    if (fresh.length === 0) return;
    fresh.forEach((id) => requested.current.add(id));
    try {
      const { data } = await http.get('/presence', { params: { ids: fresh.join(',') } });
      setPresence((prev) => {
        const next = { ...prev };
        data.forEach((p) => {
          next[p.userId] = { ...p, ...prev[p.userId] };
        });
        return next;
      });
    } catch {
      fresh.forEach((id) => requested.current.delete(id));
    }
  }, []);

  const value = useMemo(() => ({ presence, track }), [presence, track]);
  return <PresenceContext.Provider value={value}>{children}</PresenceContext.Provider>;
}

export function usePresence() {
  const ctx = useContext(PresenceContext);
  if (!ctx) throw new Error('usePresence must be used inside PresenceProvider');
  return ctx;
}
