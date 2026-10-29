import { useEffect, useState } from 'react';
import { http, apiError } from '../api/http.js';
import { useContacts } from '../context/ContactsContext.jsx';
import { useChat } from '../context/ChatContext.jsx';

// REQ-GRP-1: name (1-50 characters) + at least two contacts. Esc closes it.
export default function NewGroupDialog({ onClose }) {
  const { contacts } = useContacts();
  const { openConversation } = useChat();
  const [name, setName] = useState('');
  const [selected, setSelected] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const toggle = (id) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || name.trim().length > 50) return setError('Group name must be 1-50 characters');
    if (selected.length < 2) return setError('Choose at least two contacts');
    try {
      const { data } = await http.post('/groups', { name, memberIds: selected });
      openConversation({ id: data.groupId, type: 'group', name: data.name, members: data.members });
      onClose();
    } catch (err) {
      setError(apiError(err).message);
    }
    return undefined;
  };

  return (
    <div className="dialog-backdrop" role="presentation" onClick={onClose}>
      <form className="dialog" role="dialog" aria-label="New group" onClick={(e) => e.stopPropagation()} onSubmit={onSubmit}>
        <h2>New group</h2>
        <div className="field">
          <label htmlFor="groupName">Group name</label>
          <input id="groupName" maxLength={50} value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </div>
        <fieldset className="member-picker">
          <legend>Members (at least two)</legend>
          {contacts.length < 2 && <p className="muted small">Add at least two contacts first.</p>}
          {contacts.map((c) => (
            <label key={c.id} className="check-row">
              <input type="checkbox" checked={selected.includes(c.id)} onChange={() => toggle(c.id)} /> {c.displayName}{' '}
              <span className="muted small">@{c.username}</span>
            </label>
          ))}
        </fieldset>
        {error && <div className="field-error">{error}</div>}
        <div className="dialog-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn">Create group</button>
        </div>
      </form>
    </div>
  );
}
