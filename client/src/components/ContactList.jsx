import { useContacts } from '../context/ContactsContext.jsx';
import ContactButton from './ContactButton.jsx';
import PresenceDot from './PresenceDot.jsx';

// The user's contacts. Extra actions (e.g. "Chat") can be passed in.
export default function ContactList({ renderActions }) {
  const { contacts } = useContacts();
  return (
    <div className="sidebar-section">
      <h2>Contacts</h2>
      {contacts.length === 0 && <div className="muted small">Search for people above and add them.</div>}
      <ul className="plain-list">
        {contacts.map((u) => (
          <li key={u.id} className="list-row">
            <div>
              <div>
                <PresenceDot userId={u.id} /> {u.displayName}
              </div>
              <div className="muted small">@{u.username}</div>
            </div>
            <div className="row-actions">
              {renderActions && renderActions(u)}
              <ContactButton user={u} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
