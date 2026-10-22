import { Link } from 'react-router-dom';

// Filled in by REQ-AUTH-1.
export default function RegisterPage() {
  return (
    <div className="auth-card">
      <h1>Create account</h1>
      <p>
        Already registered? <Link to="/login">Log in</Link>
      </p>
    </div>
  );
}
