// Red, dismissible error banner (SRS 3.1 GUI standards).
export default function ErrorBanner({ message, onClose }) {
  if (!message) return null;
  return (
    <div className="banner-error" role="alert">
      <span>{message}</span>
      {onClose && (
        <button type="button" onClick={onClose} aria-label="Dismiss">
          ✕
        </button>
      )}
    </div>
  );
}
