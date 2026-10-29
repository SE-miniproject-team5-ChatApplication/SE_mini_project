// Highlights every case-insensitive match of `query` inside `text` (REQ-HIS-3).
// Builds React nodes (no HTML strings), so message text stays safe (NFR-SAFE-2).
export default function Highlight({ text, query }) {
  if (!query) return text;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = String(text).split(new RegExp(`(${escaped})`, 'ig'));
  return parts.map((part, i) => (i % 2 === 1 ? <mark key={i}>{part}</mark> : part));
}
