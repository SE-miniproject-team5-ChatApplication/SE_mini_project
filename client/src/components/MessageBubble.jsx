import { formatTime } from '../utils/format.js';
import MessageStatus from './MessageStatus.jsx';
import AttachmentView from './AttachmentView.jsx';

// One message. Text is rendered as a React text node, so any HTML or <script>
// inside a message is shown as plain characters and never executed (NFR-SAFE-2).
export default function MessageBubble({ message, mine }) {
  return (
    <div className={`bubble-row ${mine ? 'mine' : 'theirs'}`}>
      <div className={`bubble ${message.status === 'failed' ? 'bubble-failed' : ''}`}>
        {message.attachment && <AttachmentView attachment={message.attachment} />}
        {message.content && <div className="bubble-text">{message.content}</div>}
        <div className="bubble-meta">
          <span>{formatTime(message.sentAt)}</span>
          {mine && <MessageStatus status={message.status} />}
          {message.status === 'failed' && <span className="field-error" title={message.error}>Not sent</span>}
        </div>
      </div>
    </div>
  );
}
