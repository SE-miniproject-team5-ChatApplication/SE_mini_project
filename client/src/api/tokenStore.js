// Keeps the JWT and the logged-in user between page reloads.
// Storage can be unavailable (private mode), so every access is guarded.
const TOKEN_KEY = 'chat.token';
const USER_KEY = 'chat.user';

function read(key) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key, value) {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    // ignore - the session simply will not survive a reload
  }
}

export const tokenStore = {
  getToken: () => read(TOKEN_KEY),
  getUser: () => {
    try {
      return JSON.parse(read(USER_KEY));
    } catch {
      return null;
    }
  },
  save: (token, user) => {
    write(TOKEN_KEY, token);
    write(USER_KEY, JSON.stringify(user));
  },
  saveUser: (user) => write(USER_KEY, JSON.stringify(user)),
  clear: () => {
    write(TOKEN_KEY, null);
    write(USER_KEY, null);
  },
};
