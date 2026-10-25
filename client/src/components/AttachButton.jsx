import { useRef, useState } from 'react';
import { http, apiError } from '../api/http.js';

const MAX_SIZE = 10 * 1024 * 1024; // REQ-FIL-1

// Paper-clip button: uploads one file to the open conversation, then calls
// onUploaded(attachment) so the message can be sent with it.
export default function AttachButton({ conversationId, onUploaded, onError }) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);

  const onChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > MAX_SIZE) {
      onError('Files can be at most 10 MB');
      return;
    }
    const form = new FormData();
    form.append('conversationId', conversationId);
    form.append('file', file);
    setBusy(true);
    try {
      const { data } = await http.post('/files', form);
      onUploaded(data);
    } catch (err) {
      onError(apiError(err).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <input ref={inputRef} type="file" hidden onChange={onChange} />
      <button
        type="button"
        className="btn btn-secondary"
        aria-label="Attach a file"
        title="Attach a file"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
      >
        {busy ? '…' : '📎'}
      </button>
    </>
  );
}
