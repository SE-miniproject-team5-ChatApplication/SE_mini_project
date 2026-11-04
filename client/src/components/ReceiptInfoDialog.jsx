import { useEffect, useState } from 'react';
import { http, apiError } from '../api/http.js';
import { formatDateTime } from '../utils/format.js';

// REQ-RCP-5: per-member status of a group message (sender only). Esc closes it.
export default function ReceiptInfoDialog({ messageId, onClose }) {
  const [info, setInfo] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    http.get(`/messages/${messageId}/receipts`).then(({ data }) => setInfo(data)).catch((err) => setError(apiError(err).message));
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [messageId, onClose]);

  return (
    <div className="dialog-backdrop" role="presentation" onClick={onClose}>
      <div className="dialog" role="dialog" aria-label="Message info" onClick={(e) => e.stopPropagation()}>
        <h2>Message info</h2>
        {error && <div className="field-error">{error}</div>}
        {!info && !error && <p className="muted">Loading…</p>}
        {info && (
          <table className="receipt-table">
            <thead>
              <tr><th>Member</th><th>Delivered</th><th>Read</th></tr>
            </thead>
            <tbody>
              {info.members.map((m) => (
                <tr key={m.userId}>
                  <td>{m.displayName}</td>
                  <td>{m.deliveredAt ? formatDateTime(m.deliveredAt) : '-'}</td>
                  <td>{m.readAt ? formatDateTime(m.readAt) : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div className="dialog-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
