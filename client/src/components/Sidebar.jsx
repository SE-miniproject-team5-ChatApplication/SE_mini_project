import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useChat } from '../context/ChatContext.jsx';
import UserSearch from './UserSearch.jsx';
import ContactList from './ContactList.jsx';

// Left panel. Feature sections (search, contacts, chats, new group) are added
// here by their own backlog items.
export default function Sidebar() {
  const { user, logout } = useAuth();
  const { startDirectChat } = useChat();
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div>
          <strong>{user?.displayName || user?.username}</strong>
          <div className="muted small">@{user?.username}</div>
        </div>
        <div className="sidebar-actions">
          <Link to="/profile" className="btn btn-small btn-secondary">Profile</Link>
          <button type="button" className="btn btn-small btn-secondary" onClick={logout}>Logout</button>
        </div>
      </div>
      <div className="sidebar-body">
        <UserSearch />
        <ContactList
          renderActions={(u) => (
            <button type="button" className="btn btn-small" onClick={() => startDirectChat(u).catch(() => {})}>
              Chat
            </button>
          )}
        />
        <p className="muted empty-hint">No conversations yet.</p>
      </div>
    </aside>
  );
}

