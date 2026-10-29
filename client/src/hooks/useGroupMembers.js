import { useCallback, useEffect, useState } from 'react';
import { http } from '../api/http.js';
import { useSocketEvent } from './useSocketEvent.js';

// Members of a group (id -> display name), kept up to date with group:update.
// Used to show who wrote each message in a group chat (REQ-GRP-3).
export function useGroupMembers(conversation) {
  const groupId = conversation?.type === 'group' ? conversation.id : null;
  const [names, setNames] = useState({});

  const apply = useCallback((group) => {
    const next = {};
    group.members.forEach((m) => {
      next[m.userId] = m.user ? m.user.displayName : 'Deleted user';
    });
    setNames(next);
  }, []);

  useEffect(() => {
    if (!groupId) {
      setNames({});
      return undefined;
    }
    let cancelled = false;
    http
      .get(`/groups/${groupId}`)
      .then(({ data }) => !cancelled && apply(data))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [groupId, apply]);

  useSocketEvent('group:update', (u) => {
    if (u.groupId === groupId) apply(u.group);
  });

  return names;
}
