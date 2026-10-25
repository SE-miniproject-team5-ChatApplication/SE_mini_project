import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { http, apiError } from '../api/http.js';
import ErrorBanner from '../components/ErrorBanner.jsx';
import { validateEmail, validatePassword, validateUsername } from '../utils/validation.js';

// REQ-AUTH-1: register with username, email and password, with inline validation.
export default function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [banner, setBanner] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const onSubmit = async (e) => {
    e.preventDefault();
    const next = {
      username: validateUsername(form.username),
      email: validateEmail(form.email),
      password: validatePassword(form.password),
    };
    setErrors(next);
    if (Object.values(next).some(Boolean)) return;

    setBusy(true);
    setBanner('');
    try {
      await http.post('/auth/register', form);
      navigate('/login', { state: { registered: true, identifier: form.username } });
    } catch (err) {
      const e2 = apiError(err);
      if (e2.field) setErrors({ [e2.field]: e2.message });
      else setBanner(e2.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-card">
      <h1>Create account</h1>
      <ErrorBanner message={banner} onClose={() => setBanner('')} />
      <form onSubmit={onSubmit} noValidate>
        <div className="field">
          <label htmlFor="username">Username</label>
          <input id="username" autoComplete="username" value={form.username} onChange={set('username')} />
          {errors.username && <span className="field-error">{errors.username}</span>}
        </div>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" type="email" autoComplete="email" value={form.email} onChange={set('email')} />
          {errors.email && <span className="field-error">{errors.email}</span>}
        </div>
        <div className="field">
          <label htmlFor="password">Password</label>
          <input id="password" type="password" autoComplete="new-password" value={form.password} onChange={set('password')} />
          {errors.password && <span className="field-error">{errors.password}</span>}
        </div>
        <button type="submit" className="btn" disabled={busy}>
          {busy ? 'Creating…' : 'Create account'}
        </button>
      </form>
      <p>
        Already registered? <Link to="/login">Log in</Link>
      </p>
    </div>
  );
}
