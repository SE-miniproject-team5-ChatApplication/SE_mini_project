import { useState } from 'react';
import { apiError } from '../api/http.js';
import { useContacts } from '../context/ContactsContext.jsx';

// "Add contact" / "Remove" button shown next to a user (REQ-PRO-4).
export default function ContactButton({ user }) {
  const { isContact, addContact, removeContact } = useContacts();
  const [error, setError] = useState('');
  const added = isContact(user.id);

  const onClick = async () => {
    setError('');
    try {
      if (added) await removeContact(user);
      else await addContact(user);
    } catch (err) {
      setError(apiError(err).message);
    }
  };

  return (
    <span>
      <button type="button" className="btn btn-small btn-secondary" onClick={onClick}>
        {added ? 'Remove' : 'Add contact'}
      </button>
      {error && <span className="field-error"> {error}</span>}
    </span>
  );
}
