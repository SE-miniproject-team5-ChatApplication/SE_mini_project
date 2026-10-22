import { useState } from 'react';
import { useChat } from '../context/ChatContext.jsx';

// Enter sends, Shift+Enter adds a new line (SRS 3.1 keyboard support).
export default function MessageInput() {
  const { sendMessage } = useChat();
  const [text, setText] = useState('');

  const submit = () => {
    if (!text.trim()) return;
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
      <textarea
        aria-label="Message"
        placeholder="Type a message"
        rows={1}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={onKeyDown}
      />
      <button type="submit" className="btn" disabled={!text.trim()}>Send</button>
    </form>
  );
}
