// Small date helpers used across the chat screens.
export function formatTime(value) {
  if (!value) return '';
  const d = new Date(value);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function formatDateTime(value) {
  if (!value) return '';
  const d = new Date(value);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return formatTime(d);
  return d.toLocaleDateString([], { day: 'numeric', month: 'short' }) + ' ' + formatTime(d);
}
