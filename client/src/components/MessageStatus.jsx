// Tick icons (SAD 4.5): ✓ sent, ✓✓ delivered, blue ✓✓ read.
const LABELS = { pending: 'Sending', sent: 'Sent', delivered: 'Delivered', read: 'Read' };

export default function MessageStatus({ status }) {
  if (!LABELS[status]) return null;
  if (status === 'pending') return <span title={LABELS.pending}>…</span>;
  return (
    <span className={`ticks ticks-${status}`} title={LABELS[status]} aria-label={LABELS[status]}>
      {status === 'sent' ? '✓' : '✓✓'}
    </span>
  );
}
