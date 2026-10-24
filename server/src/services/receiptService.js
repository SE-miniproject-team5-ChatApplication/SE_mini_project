// Delivery and read receipts (REQ-RCP-1..5). A message status only moves
// forward: sent -> delivered -> read  (deleted is final, see REQ-MSG-8).
const STATUS_RANK = { sent: 0, delivered: 1, read: 2, deleted: 3 };

function canAdvance(from, to) {
  return STATUS_RANK[to] !== undefined && STATUS_RANK[to] > STATUS_RANK[from];
}

// Works for direct chats (one recipient) and groups (many recipients):
// "delivered" when every recipient's client has it, "read" when every recipient read it.
function computeStatus({ current, recipientIds, deliveredTo = [], readBy = [] }) {
  if (current === 'deleted') return 'deleted';
  const read = new Set(readBy.map((r) => String(r.userId)));
  const delivered = new Set([...deliveredTo.map((r) => String(r.userId)), ...read]);
  const recipients = recipientIds.map(String);
  let next = 'sent';
  if (recipients.length > 0 && recipients.every((id) => read.has(id))) next = 'read';
  else if (recipients.length > 0 && recipients.every((id) => delivered.has(id))) next = 'delivered';
  return canAdvance(current, next) ? next : current;
}

module.exports = { STATUS_RANK, canAdvance, computeStatus };
