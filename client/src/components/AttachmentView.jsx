// Shows an attached file: name and size. (Download and image preview are
// added by REQ-FIL-4 and REQ-FIL-3.)
export function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function AttachmentView({ attachment }) {
  return (
    <div className="attachment">
      <span aria-hidden="true">📎</span> {attachment.fileName}{' '}
      <span className="muted small">({formatSize(attachment.size)})</span>
    </div>
  );
}
