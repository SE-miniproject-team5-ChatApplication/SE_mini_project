import { formatTime } from '../utils/format.js';

// One message. Text is rendered as a React text node, so any HTML or <script>
// inside a message is shown as plain characters and never executed (NFR-SAFE-2).
export default function MessageBubble({ message }) {
  return (
    <div className={`bubble-row ${message.mine ? 'mine' : 'theirs'}`}>
      <div className="bubble">
        <div className="bubble-text">{message.content}</div>
        <div className="bubble-meta">
          <span>{formatTime(message.sentAt)}</span>
        </div>
      </div>
    </div>
  );
}
