import { formatTime } from '../utils/format.js';
import { useChat } from '../context/ChatContext.jsx';
import MessageStatus from './MessageStatus.jsx';
import AttachmentView from './AttachmentView.jsx';

// One message. Text is rendered as a React text node, so any HTML or <script>
// inside a message is shown as plain characters and never executed (NFR-SAFE-2).
export default function MessageBubble({ message, mine }) {
  const { deleteMessage } = useChat();
  const deleted = message.status === 'deleted';

  // SAD 4.5: confirm before deleting a message.
  const onDelete = () => {
    if (window.confirm('Delete this message for everyone?')) deleteMessage(message).catch(() => {});
  };

  return (
    <div className={`bubble-row ${mine ? 'mine' : 'theirs'}`}>
      <div className={`bubble ${message.status === 'failed' ? 'bubble-failed' : ''}`}>
        {deleted ? (
          <div className="bubble-text deleted">This message was deleted</div>
        ) : (
          <>
            {message.attachment && <AttachmentView attachment={message.attachment} />}
            {message.content && <div className="bubble-text">{message.content}</div>}
          </>
        )}
        <div className="bubble-meta">
          <span>{formatTime(message.sentAt)}</span>
          {mine && !deleted && <MessageStatus status={message.status} />}
          {message.status === 'failed' && <span className="field-error" title={message.error}>Not sent</span>}
          {mine && !deleted && message.id && (
            <button type="button" className="link-btn" onClick={onDelete} aria-label="Delete message">
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
