// Same rules as the server (REQ-AUTH-1) so users see mistakes before submitting.
// The server still checks everything - the client check is only for convenience.
export function validateUsername(v) {
  return /^[A-Za-z0-9_]{3,20}$/.test(v) ? '' : 'Username must be 3-20 characters: letters, digits or underscore';
}

export function validateEmail(v) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) && v.length <= 100 ? '' : 'Enter a valid email address';
}

export function validatePassword(v) {
  if (v.length < 8 || v.length > 64) return 'Password must be 8-64 characters long';
  if (!/[A-Za-z]/.test(v) || !/\d/.test(v)) return 'Password must contain at least one letter and one digit';
  return '';
}
