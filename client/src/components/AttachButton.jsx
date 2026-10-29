
import { useRef, useState } from 'react';
import { http, apiError } from '../api/http.js';

const MAX_SIZE = 10 * 1024 * 1024; // REQ-FIL-1

export default function AttachButton({
  conversationId,
  onUploaded,
  onError,
}) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);

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
    setProgress(0);

    try {
      const { data } = await http.post('/files', form, {
        onUploadProgress: (event) => {
          if (event.total) {
            const percent = Math.round(
              (event.loaded * 100) / event.total
            );
            setProgress(Math.min(percent, 100));
          }
        },
      });

      setProgress(100);
      onUploaded(data);
    } catch (err) {
      onError(apiError(err).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".jpg,.jpeg,.png,.gif,.pdf,.docx,.txt,.zip"
        hidden
        onChange={onChange}
      />

      <button
        type="button"
        className="btn btn-secondary"
        aria-label="Attach a file"
        title="Attach a file"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
      >
        Attach
      </button>

      {busy && (
        <div className="upload-progress" role="status" aria-live="polite">
          <div className="upload-progress-label">
            Uploading… {progress}%
          </div>
          <progress
            className="upload-progress-bar"
            value={progress}
            max="100"
            aria-label="File upload progress"
          />
        </div>
      )}
    </>
  );
}
