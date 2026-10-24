// Unique id for each message the browser sends (used to detect resends, REQ-MSG-7).
// crypto.randomUUID only exists on https:// or localhost, so there is a fallback.
export function newClientMsgId() {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
