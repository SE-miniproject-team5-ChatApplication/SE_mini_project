import { useCallback, useEffect, useState } from 'react';
import { http, apiError } from '../api/http.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useContacts } from '../context/ContactsContext.jsx';
import { useSocketEvent } from '../hooks/useSocketEvent.js';

// Group info screen (SRS 3.1): member list with roles; admins can add, remove,
// rename and promote (REQ-GRP-2). Esc closes it.
export default function GroupInfoDialog({ groupId, onClose, footer }) {
  const { user } = useAuth();
  const { contacts } = useContacts();
  const [group, setGroup] = useState(null);
  const [error, setError] = useState('');
  const [newName, setNewName] = useState('');
  const [toAdd, setToAdd] = useState('');

  const load = useCallback(async () => {
    try {
      const { data } = await http.get(`/groups/${groupId}`);
      setGroup(data);
      setNewName(data.name);
    } catch (err) {
      setError(apiError(err).message);
    }
  }, [groupId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  useSocketEvent('group:update', (u) => {
    if (u.groupId === groupId) setGroup(u.group);
  });

  const run = async (fn) => {
    setError('');
    try {
      const { data } = await fn();
      if (data && data.members) setGroup(data);
    } catch (err) {
      setError(apiError(err).message);
    }
  };

  if (!group) {
    return (
      <div className="dialog-backdrop" onClick={onClose} role="presentation">
        <div className="dialog">{error || 'Loading…'}</div>
      </div>
    );
  }

  const me = group.members.find((m) => m.userId === user.id);
  const isAdmin = me?.role === 'admin';
  const candidates = contacts.filter((c) => !group.members.some((m) => m.userId === c.id));

  return (
    <div className="dialog-backdrop" role="presentation" onClick={onClose}>
      <div className="dialog" role="dialog" aria-label="Group info" onClick={(e) => e.stopPropagation()}>
        <h2>{group.name}</h2>
        {error && <div className="field-error">{error}</div>}
        {isAdmin && (
          <form className="inline-form" onSubmit={(e) => { e.preventDefault(); run(() => http.put(`/groups/${groupId}`, { name: newName })); }}>
            <input aria-label="Group name" maxLength={50} value={newName} onChange={(e) => setNewName(e.target.value)} />
            <button type="submit" className="btn btn-small">Rename</button>
          </form>
        )}
        <h3>{group.members.length} members</h3>
        <ul className="plain-list">
          {group.members.map((m) => (
            <li key={m.userId} className="list-row">
              <span>
                {m.user ? m.user.displayName : 'Deleted user'} {m.userId === user.id && '(you)'}{' '}
                {m.role === 'admin' && <span className="badge-role">admin</span>}
              </span>
              {isAdmin && m.userId !== user.id && (
                <span className="row-actions">
                  {m.role !== 'admin' && (
                    <button type="button" className="btn btn-small btn-secondary" onClick={() => run(() => http.post(`/groups/${groupId}/admins`, { userId: m.userId }))}>
                      Make admin
                    </button>
                  )}
                  <button type="button" className="btn btn-small btn-secondary" onClick={() => run(() => http.delete(`/groups/${groupId}/members/${m.userId}`))}>
                    Remove
                  </button>
                </span>
              )}
            </li>
          ))}
        </ul>
        {isAdmin && candidates.length > 0 && (
          <form className="inline-form" onSubmit={(e) => { e.preventDefault(); if (toAdd) run(() => http.post(`/groups/${groupId}/members`, { userId: toAdd })); setToAdd(''); }}>
            <select aria-label="Contact to add" value={toAdd} onChange={(e) => setToAdd(e.target.value)}>
              <option value="">Add a contact…</option>
              {candidates.map((c) => (
                <option key={c.id} value={c.id}>{c.displayName}</option>
              ))}
            </select>
            <button type="submit" className="btn btn-small" disabled={!toAdd}>Add</button>
          </form>
        )}
        <div className="dialog-actions">
          {footer}
          <button type="button" className="btn btn-secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
