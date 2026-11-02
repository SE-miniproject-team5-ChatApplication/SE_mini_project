import { useState } from 'react';
import { Link } from 'react-router-dom';
import { http, apiError } from '../api/http.js';
import { useAuth } from '../context/AuthContext.jsx';
import ErrorBanner from '../components/ErrorBanner.jsx';
import Avatar from '../components/Avatar.jsx';
import { validatePassword } from '../utils/validation.js';

// REQ-PRO-5: change password (current password required).
function PasswordForm() {
  const [form, setForm] = useState({ currentPassword: '', newPassword: '' });
  const [error, setError] = useState({});
  const [done, setDone] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setDone(false);
    const weak = validatePassword(form.newPassword);
    if (weak) return setError({ field: 'newPassword', message: weak });
    setError({});
    try {
      await http.put('/auth/password', form);
      setForm({ currentPassword: '', newPassword: '' });
      setDone(true);
    } catch (err) {
      setError(apiError(err));
    }
    return undefined;
  };

  return (
    <form onSubmit={onSubmit}>
      <h2>Change password</h2>
      <div className="field">
        <label htmlFor="currentPassword">Current password</label>
        <input id="currentPassword" type="password" autoComplete="current-password" value={form.currentPassword} onChange={(e) => setForm({ ...form, currentPassword: e.target.value })} />
      </div>
      <div className="field">
        <label htmlFor="newPassword">New password</label>
        <input id="newPassword" type="password" autoComplete="new-password" value={form.newPassword} onChange={(e) => setForm({ ...form, newPassword: e.target.value })} />
        {error.field === 'newPassword' && <span className="field-error">{error.message}</span>}
      </div>
      {error.message && error.field !== 'newPassword' && <div className="field-error">{error.message}</div>}
      <button type="submit" className="btn" disabled={!form.currentPassword || !form.newPassword}>Change password</button>
      {done && <span className="muted"> Password changed.</span>}
    </form>
  );
}

// REQ-PRO-2: JPG or PNG up to 2 MB (checked again by the server).
function AvatarForm() {
  const { user, updateUser } = useAuth();
  const [error, setError] = useState('');
  const [version, setVersion] = useState(0);

  const onChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError('');
    if (!/\.(jpe?g|png)$/i.test(file.name)) return setError('Avatar must be a JPG or PNG image');
    if (file.size > 2 * 1024 * 1024) return setError('Avatar images can be at most 2 MB');
    const form = new FormData();
    form.append('avatar', file);
    try {
      const { data } = await http.post('/users/me/avatar', form);
      updateUser({ ...user, avatarUrl: data.avatarUrl }); // the server answers with { avatarUrl } only
      setVersion((v) => v + 1);
    } catch (err) {
      setError(apiError(err).message);
    }
    return undefined;
  };

  return (
    <div className="avatar-form">
      <Avatar user={user} size={72} version={version} />
      <label className="btn btn-secondary btn-small">
        Change avatar
        <input type="file" accept=".jpg,.jpeg,.png" hidden onChange={onChange} />
      </label>
      {error && <div className="field-error">{error}</div>}
    </div>
  );
}

// REQ-PRO-1: view and edit display name and status message.
function ProfileForm() {
  const { user, updateUser } = useAuth();
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [statusMessage, setStatusMessage] = useState(user?.statusMessage || '');
  const [error, setError] = useState({});
  const [saved, setSaved] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setSaved(false);
    setError({});
    if (displayName.trim().length < 1 || displayName.trim().length > 40) {
      setError({ field: 'displayName', message: 'Display name must be 1-40 characters' });
      return;
    }
    try {
      const { data } = await http.put('/users/me', { displayName, statusMessage });
      updateUser(data);
      setSaved(true);
    } catch (err) {
      setError(apiError(err));
    }
  };

  return (
    <form onSubmit={onSubmit}>
      <h2>Profile</h2>
      {error.message && !error.field && <ErrorBanner message={error.message} onClose={() => setError({})} />}
      <div className="field">
        <label htmlFor="displayName">Display name</label>
        <input id="displayName" maxLength={40} value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
        {error.field === 'displayName' && <span className="field-error">{error.message}</span>}
      </div>
      <div className="field">
        <label htmlFor="statusMessage">Status message</label>
        <input id="statusMessage" maxLength={100} value={statusMessage} onChange={(e) => setStatusMessage(e.target.value)} />
        {error.field === 'statusMessage' && <span className="field-error">{error.message}</span>}
      </div>
      <button type="submit" className="btn">Save</button>
      {saved && <span className="muted"> Saved.</span>}
    </form>
  );
}

// NFR-SEC-7: delete the account (asks for the password and a confirmation).
function DeleteAccount() {
  const { logout } = useAuth();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const onDelete = async (e) => {
    e.preventDefault();
    if (!window.confirm('Delete your account permanently? This cannot be undone.')) return;
    try {
      await http.delete('/users/me', { data: { password } });
      await logout();
    } catch (err) {
      setError(apiError(err).message);
    }
  };

  return (
    <form onSubmit={onDelete}>
      <h2>Delete account</h2>
      <p className="muted small">Your profile, contacts and group memberships are removed. Messages you sent stay visible to the people you sent them to.</p>
      <div className="field">
        <label htmlFor="deletePassword">Password</label>
        <input id="deletePassword" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      {error && <div className="field-error">{error}</div>}
      <button type="submit" className="btn btn-danger" disabled={!password}>Delete my account</button>
    </form>
  );
}

export default function ProfilePage() {
  const { user } = useAuth();
  return (
    <div className="auth-card profile-page">
      <p>
        <Link to="/">← Back to chats</Link>
      </p>
      <AvatarForm />
      <h1>{user?.displayName}</h1>
      <p className="muted">@{user?.username} · {user?.email}</p>
      <ProfileForm />
      <PasswordForm />
      <DeleteAccount />
    </div>
  );
}
