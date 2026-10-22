import { Link } from 'react-router-dom';

// Filled in by REQ-AUTH-4.
export default function LoginPage() {
  return (
    <div className="auth-card">
      <h1>Log in</h1>
      <p>
        No account? <Link to="/register">Register</Link>
      </p>
    </div>
  );
}
