import { useAuthBlobUrl } from '../hooks/useAuthBlobUrl.js';

// Round profile picture; falls back to the first letter of the name.
export default function Avatar({ user, size = 36, version = 0 }) {
  const src = useAuthBlobUrl(user?.avatarUrl ? `${user.avatarUrl}?v=${version}` : null);
  const letter = (user?.displayName || user?.username || '?').charAt(0).toUpperCase();
  return src ? (
    <img className="avatar" src={src} alt={`${user.displayName}'s avatar`} width={size} height={size} />
  ) : (
    <span className="avatar avatar-letter" style={{ width: size, height: size }} aria-hidden="true">
      {letter}
    </span>
  );
}
