
import { useEffect, useState } from 'react';
import { http } from '../api/http.js';

export function formatSize(bytes = 0) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(0)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isPng(mimeType, fileName) {
  return mimeType === 'image/png' || /\.png$/i.test(fileName || '');
}

function isPdf(mimeType, fileName) {
  return mimeType === 'application/pdf' || /\.pdf$/i.test(fileName || '');
}

export default function AttachmentView({ attachment }) {
  const [imageUrl, setImageUrl] = useState('');
  const [imageError, setImageError] = useState(false);

  const attachmentUrl = attachment.url ||
    (attachment.attachmentId || attachment.id
      ? `/api/files/${encodeURIComponent(
          attachment.attachmentId || attachment.id
        )}`
      : '');

  const mimeType = attachment.mimeType;
  const fileName = attachment.fileName;
  const size = attachment.size;
  const png = isPng(mimeType, fileName);
  const pdf = isPdf(mimeType, fileName);

  useEffect(() => {
    let objectUrl;
    let cancelled = false;

    if (!attachmentUrl || !png) {
      setImageUrl('');
      setImageError(false);
      return undefined;
    }

    http.get(attachmentUrl, { responseType: 'blob' })
      .then(({ data }) => {
        if (cancelled) return;

        objectUrl = URL.createObjectURL(data);
        setImageUrl(objectUrl);
        setImageError(false);
      })
      .catch(() => {
        if (!cancelled) setImageError(true);
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [attachmentUrl, png]);

  return (
    <div className="attachment">
      {png && imageUrl && !imageError && (
        <img
          className="attachment-thumbnail"
          src={imageUrl}
          alt={fileName || 'Uploaded image'}
          loading="lazy"
        />
      )}

      {png && imageError && (
        <span className="muted small">
          Image preview unavailable
        </span>
      )}

      {(pdf || !png) && attachmentUrl && (
        <a href={attachmentUrl} download>
          {fileName}
        </a>
      )}

      <span className="muted small">
        ({formatSize(size)})
      </span>
    </div>
  );
}
