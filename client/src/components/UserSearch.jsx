import { useState } from 'react';
import { http, apiError } from '../api/http.js';
import { useChat } from '../context/ChatContext.jsx';

export default function UserSearch() {
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { startDirectChat } = useChat();

  const search = async (event) => {
    event.preventDefault();
    if (!query.trim()) {
      setUsers([]);
      setError('');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const { data } = await http.get('/users/search', {
        params: { q: query.trim() },
      });
      setUsers((Array.isArray(data) ? data : data.users || []).map((u) => ({ ...u, id: u.id || u.userId })));
    } catch (err) {
      setError(apiError(err).message);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="user-search">
      <form onSubmit={search}>
        <label htmlFor="user-search-input">Find users</label>
        <div className="search-row">
          <input
            id="user-search-input"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by username"
          />
          <button className="btn btn-small" type="submit" disabled={loading}>
            {loading ? 'Searching…' : 'Search'}
          </button>
        </div>
      </form>

      {error && <p role="alert" className="error-text">{error}</p>}

      {users.map((user) => (
        <div className="contact-row" key={user.id}>
          <span>{user.displayName || user.username || user.id}</span>
          <button
            type="button"
            className="btn btn-small"
            onClick={() => startDirectChat(user).catch((err) => setError(apiError(err).message))}
          >
            Chat
          </button>
        </div>
      ))}
    </section>
  );
}

