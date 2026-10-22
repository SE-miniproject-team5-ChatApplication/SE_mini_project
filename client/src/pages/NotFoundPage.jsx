import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="auth-card">
      <h1>Page not found</h1>
      <Link to="/">Go to chats</Link>
    </div>
  );
}
