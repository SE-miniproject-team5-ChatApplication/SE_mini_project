import { useEffect, useState } from 'react';
import { http, apiError } from '../api/http.js';
import { useDebounce } from '../hooks/useDebounce.js';
import { useChat } from '../context/ChatContext.jsx';
import { useConversations } from '../context/ConversationsContext.jsx';
import { formatDateTime } from '../utils/format.js';
import Highlight from './Highlight.jsx';

// REQ-HIS-3: search messages in the open chat or in all chats; clicking a
// result opens the conversation at that message.
export default function SearchPanel() {
  const { activeConversation, openConversation, focusMessage } = useChat();
  const { conversations } = useConversations();
  const [q, setQ] = useState('');
  const [onlyThisChat, setOnlyThisChat] = useState(false);
  const [results, setResults] = useState([]);
  const [error, setError] = useState('');
  const query = useDebounce(q.trim(), 350);
  const scopeId = onlyThisChat && activeConversation ? activeConversation.id : '';

  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      setError('');
      return undefined;
    }
    let cancelled = false;
    http
      .get('/search', { params: { q: query, conversationId: scopeId || undefined } })
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
  }, [query, scopeId]);

  const open = (r) => {
    const conv = conversations.find((c) => c.id === r.conversationId) || { id: r.conversationId, name: r.conversationName };
    openConversation(conv);
    focusMessage(r.message.id);
  };

  return (
    <div className="sidebar-section">
      <input className="search-input" type="search" placeholder="Search messages" aria-label="Search messages" value={q} onChange={(e) => setQ(e.target.value)} />
      {activeConversation && (
        <label className="small muted">
          <input type="checkbox" checked={onlyThisChat} onChange={(e) => setOnlyThisChat(e.target.checked)} /> Only in “{activeConversation.name}”
        </label>
      )}
      {error && <div className="field-error">{error}</div>}
      {query.length >= 2 && !error && results.length === 0 && <div className="muted small">No messages found.</div>}
      <ul className="plain-list">
        {results.map((r) => (
          <li key={r.message.id}>
            <button type="button" className="conversation-row" onClick={() => open(r)}>
              <span className="conversation-main">
                <span className="conversation-name">{r.conversationName}</span>
                <span className="small">
                  <Highlight text={r.snippet} query={query} />
                </span>
              </span>
              <span className="muted small">{formatDateTime(r.message.sentAt)}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
