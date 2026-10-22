import { Link } from 'react-router-dom';

export default function AboutPage() {
  return (
    <div className="auth-card">
      <h1>Help / About</h1>
      <p>Team 5 Chat - a real-time messaging app built with Node.js, Socket.IO, MongoDB and React.</p>
      <ul>
        <li>Press <kbd>Enter</kbd> to send, <kbd>Shift</kbd>+<kbd>Enter</kbd> for a new line.</li>
        <li>Press <kbd>Esc</kbd> to close dialogs.</li>
        <li>Search for people by name, add them as contacts, then start a chat.</li>
      </ul>
      <p>
        <Link to="/">Back to chats</Link>
      </p>
    </div>
  );
}
