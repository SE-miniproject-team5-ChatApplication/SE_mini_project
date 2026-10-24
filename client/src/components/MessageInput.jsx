import { useState } from 'react';
import { useChat } from '../context/ChatContext.jsx';

const MAX_LENGTH = 2000; // REQ-MSG-4

// Enter sends, Shift+Enter adds a new line (SRS 3.1 keyboard support).
export default function MessageInput() {
  const { sendMessage } = useChat();
  const [text, setText] = useState('');
  const tooLong = text.length > MAX_LENGTH;
  const canSend = text.trim().length > 0 && !tooLong;

  const submit = () => {
    if (!canSend) return;
    sendMessage(text);
    setText('');
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <form
      className="message-input"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <div className="message-input-box">
        <textarea
          aria-label="Message"
          placeholder="Type a message"
          rows={1}
          value={text}
          onChange={(e) => setText(e.target.value)}
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
