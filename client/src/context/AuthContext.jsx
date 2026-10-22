import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { tokenStore } from '../api/tokenStore.js';
import { createSocket } from '../api/socket.js';

const AuthContext = createContext(null);

// Holds the logged-in user, the JWT and the single WebSocket connection.
export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => tokenStore.getToken());
  const [user, setUser] = useState(() => tokenStore.getUser());
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);

  const login = useCallback((newToken, newUser) => {
    tokenStore.save(newToken, newUser);
    setToken(newToken);
    setUser(newUser);
  }, []);

  const clearSession = useCallback(() => {
    tokenStore.clear();
    setToken(null);
    setUser(null);
  }, []);

  const logout = useCallback(async () => {
    clearSession();
  }, [clearSession]);

  const updateUser = useCallback((nextUser) => {
    tokenStore.saveUser(nextUser);
    setUser(nextUser);
  }, []);

  // Open one socket while logged in; close it on logout.
  useEffect(() => {
    if (!token) return undefined;
    const s = createSocket(token);
    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    const onConnectError = (err) => {
      if (err?.message === 'UNAUTHENTICATED') clearSession();
    };
    s.on('connect', onConnect);
    s.on('disconnect', onDisconnect);
    s.on('connect_error', onConnectError);
    setSocket(s);
    return () => {
      s.off('connect', onConnect);
      s.off('disconnect', onDisconnect);
      s.off('connect_error', onConnectError);
      s.disconnect();
      setSocket(null);
      setConnected(false);
    };
  }, [token, clearSession]);

  useEffect(() => {
    window.addEventListener('auth:expired', clearSession);
    return () => window.removeEventListener('auth:expired', clearSession);
  }, [clearSession]);

  const value = useMemo(
    () => ({ token, user, socket, connected, login, logout, updateUser, isAuthenticated: Boolean(token) }),
    [token, user, socket, connected, login, logout, updateUser]
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
