import { useState } from 'react';
import { formatTime } from '../utils/format.js';
import { useChat } from '../context/ChatContext.jsx';
import MessageStatus from './MessageStatus.jsx';
import AttachmentView from './AttachmentView.jsx';
import ReceiptInfoDialog from './ReceiptInfoDialog.jsx';

// One message. Text is rendered as a React text node, so any HTML or <script>
// inside a message is shown as plain characters and never executed (NFR-SAFE-2).
export default function MessageBubble({ message, mine, senderName }) {
  const { deleteMessage, activeConversation } = useChat();
  const [showInfo, setShowInfo] = useState(false);
  const canShowInfo = mine && message.id && activeConversation?.type === 'group' && message.status !== 'deleted';
  const deleted = message.status === 'deleted';

  // SAD 4.5: confirm before deleting a message.
  const onDelete = () => {
    if (window.confirm('Delete this message for everyone?')) deleteMessage(message).catch(() => {});
  };

  return (
    <div className={`bubble-row ${mine ? 'mine' : 'theirs'}`} data-message-id={message.id}>
      <div className={`bubble ${message.status === 'failed' ? 'bubble-failed' : ''}`}>
        {senderName && <div className="bubble-sender">{senderName}</div>}
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
          {canShowInfo && (
            <button type="button" className="link-btn" onClick={() => setShowInfo(true)}>
              Info
            </button>
          )}
          {mine && !deleted && message.id && (
            <button type="button" className="link-btn" onClick={onDelete} aria-label="Delete message">
              Delete
            </button>
          )}
        </div>
      </div>
      {showInfo && <ReceiptInfoDialog messageId={message.id} onClose={() => setShowInfo(false)} />}
    </div>
  );
}
