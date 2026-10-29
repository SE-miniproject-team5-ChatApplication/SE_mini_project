import { useState } from 'react';
import { useChat } from '../context/ChatContext.jsx';
import AttachButton from './AttachButton.jsx';
import { useTypingEmitter } from '../hooks/useTypingEmitter.js';

const MAX_LENGTH = 2000; // REQ-MSG-4

// Enter sends, Shift+Enter adds a new line (SRS 3.1 keyboard support).
export default function MessageInput() {
  const { sendMessage, activeConversation } = useChat();
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const typing = useTypingEmitter(activeConversation.id); // REQ-PRS-3
  const tooLong = text.length > MAX_LENGTH;
  const canSend = text.trim().length > 0 && !tooLong;

  const submit = () => {
    if (!canSend) return;
    typing.stop();
    sendMessage(text);
    setText('');
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  // REQ-FIL-1: the uploaded file is sent as a message (with any typed text).
  const onUploaded = (attachment) => {
    setError('');
    sendMessage(tooLong ? '' : text, attachment);
    setText('');
  };

  return (
    <form
      className="message-input"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <AttachButton conversationId={activeConversation.id} onUploaded={onUploaded} onError={setError} />
      <div className="message-input-box">
        {error && <div className="field-error small">{error}</div>}
        <textarea
          aria-label="Message"
          placeholder="Type a message"
          rows={1}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            typing.onKeystroke();
          }}
          onKeyDown={onKeyDown}
        />
        {text.length > MAX_LENGTH - 200 && (
          <div className={`small ${tooLong ? 'field-error' : 'muted'}`}>
            {text.length}/{MAX_LENGTH}
          </div>
        )}
      </div>
      <button type="submit" className="btn" disabled={!canSend}>Send</button>
    </form>
  );
}
