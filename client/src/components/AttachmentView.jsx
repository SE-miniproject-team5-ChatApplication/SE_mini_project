import { useState } from 'react';
import { useAuthBlobUrl } from '../hooks/useAuthBlobUrl.js';
import { downloadFile } from '../utils/download.js';

export function formatSize(bytes = 0) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(0)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isImage(mimeType, fileName) {
  return /^image\//.test(mimeType || '') || /\.(jpe?g|png|gif)$/i.test(fileName || '');
}

// REQ-FIL-3: the file is fetched with the login token, which an <img> cannot send.
function Thumbnail({ url, fileName }) {
  const src = useAuthBlobUrl(url);
  if (!src) return null;
  return (
    <div className="attachment-preview">
      <img className="attachment-thumbnail" src={src} alt={fileName || 'Uploaded image'} />
    </div>
  );
}

// REQ-FIL-3, REQ-FIL-4: images as an inline thumbnail; every file has its name,
// size and a Download button.
export default function AttachmentView({ attachment }) {
  const [error, setError] = useState('');
  const { fileName, mimeType, size } = attachment;
  const attachmentId = attachment.attachmentId || attachment.id;
  const url = attachment.url || (attachmentId ? `/api/files/${encodeURIComponent(attachmentId)}` : '');

  const onDownload = () => {
    setError('');
    downloadFile(url, fileName).catch(() => setError('Download failed'));
  };

  return (
    <div className="attachment">
      {url && isImage(mimeType, fileName) && <Thumbnail url={url} fileName={fileName} />}
      <span>{fileName}</span>
      <span className="muted small">({formatSize(size)})</span>
      {url && (
        <button type="button" className="link-btn" onClick={onDownload}>
          Download
        </button>
      )}
      {error && <span className="field-error small">{error}</span>}
    </div>
  );
}
