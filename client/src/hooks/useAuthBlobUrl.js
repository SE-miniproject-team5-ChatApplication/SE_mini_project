import { useEffect, useState } from 'react';
import { http } from '../api/http.js';

// Protected files (avatars, attachments) need the Authorization header, which
// an <img src> cannot send. This downloads the file with the token and returns
// a temporary blob: URL that <img> can show.
export function useAuthBlobUrl(url) {
  const [blobUrl, setBlobUrl] = useState(null);
  useEffect(() => {
    if (!url) {
      setBlobUrl(null);
      return undefined;
    }
    let objectUrl = null;
    let cancelled = false;
    http
      .get(url.replace(/^\/api/, ''), { responseType: 'blob' })
      .then(({ data }) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(data);
        setBlobUrl(objectUrl);
      })
      .catch(() => !cancelled && setBlobUrl(null));
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [url]);
  return blobUrl;
}
