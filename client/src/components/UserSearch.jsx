import { useEffect, useState } from 'react';
import { http, apiError } from '../api/http.js';
import { useDebounce } from '../hooks/useDebounce.js';

// REQ-PRO-3: search other users by part of their username or display name.
export default function UserSearch({ renderActions }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [error, setError] = useState('');
  const debounced = useDebounce(query.trim());

  useEffect(() => {
    if (debounced.length < 2) {
      setResults([]);
      setError('');
      return undefined;
    }
    let cancelled = false;
    http
      .get('/users/search', { params: { q: debounced } })
      .then(({ data }) => {
        if (!cancelled) {
          setResults(data);
          setError('');
        }
      })
      .catch((err) => !cancelled && setError(apiError(err).message));
    return () => {
      cancelled = true;
    };
  }, [debounced]);

  return (
    <div className="sidebar-section">
      <input
        className="search-input"
        type="search"
        placeholder="Search people"
        aria-label="Search people"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {error && <div className="field-error">{error}</div>}
      {debounced.length >= 2 && results.length === 0 && !error && <div className="muted small">No users found.</div>}
      <ul className="plain-list">
        {results.map((u) => (
          <li key={u.id} className="list-row">
            <div>
              <div>{u.displayName}</div>
              <div className="muted small">@{u.username}</div>
            </div>
            {renderActions && renderActions(u)}
          </li>
        ))}
      </ul>
    </div>
  );
}
