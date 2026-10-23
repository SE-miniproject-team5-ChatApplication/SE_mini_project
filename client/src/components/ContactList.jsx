import { useEffect, useState } from 'react';
import { http, apiError } from '../api/http.js';
import { useChat } from '../context/ChatContext.jsx';

export default function ContactList() {
  const [contacts, setContacts] = useState([]);
  const [error, setError] = useState('');
  const { startDirectChat } = useChat();

  useEffect(() => {
    let active = true;

    http.get('/contacts')
      .then(({ data }) => {
        if (!active) return;
        setContacts(Array.isArray(data) ? data : data.contacts || []);
      })
      .catch((err) => {
        if (active) setError(apiError(err).message);
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <section className="contact-list">
      <h3>Contacts</h3>
      {error && <p role="alert" className="error-text">{error}</p>}
      {!error && contacts.length === 0 && <p className="muted">No contacts yet.</p>}

      {contacts.map((entry) => {
        const user = entry.user || entry.contact || entry;
        const id = user.id || user.userId || user._id || entry.contactUserId || entry.userId;
        if (!id) return null;

        return (
          <div className="contact-row" key={id}>
            <span>{user.displayName || user.username || id}</span>
            <button
              type="button"
              className="btn btn-small"
              onClick={() =>
                startDirectChat({ ...user, id }).catch((err) =>
                  setError(apiError(err).message)
                )
              }
            >
              Chat
            </button>
          </div>
        );
      })}
    </section>
  );
}

