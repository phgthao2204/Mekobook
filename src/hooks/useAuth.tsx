import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { AuthSession, UserAccount } from '../types';
import { login, logout, refreshSession, reloadUserProfile, restoreSession } from '../services/auth';
import { setApiAccessToken, setSessionRenewal } from '../services/http';

interface AuthContextValue {
  session: AuthSession | null;
  restoring: boolean;
  signIn: (username: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<UserAccount>;
}
const AuthContext = createContext<AuthContextValue | null>(null);
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [restoring, setRestoring] = useState(true);
  const sessionRef = useRef<AuthSession | null>(null);
  const renewal = useRef<Promise<AuthSession> | null>(null);
  const generation = useRef(0);
  const update = (value: AuthSession | null) => { sessionRef.current = value; setSession(value); };
  const signOut = async () => {
    generation.current++;
    update(null);
    await logout();
  };
  const renew = async (): Promise<string> => {
    const current = sessionRef.current;
    if (!current) throw new Error('Vui lòng đăng nhập lại.');
    const version = generation.current;
    renewal.current ??= refreshSession(current).finally(() => { renewal.current = null; });
    try {
      const next = await renewal.current;
      if (version !== generation.current) {
        throw new Error('Phiên đăng nhập đã đóng.');
      }
      update(next);
      return next.accessToken;
    } catch (error) {
      if (version === generation.current) await signOut();
      throw error;
    }
  };
  useEffect(() => {
    let active = true;
    const version = generation.current;
    restoreSession().then(value => { if (active && version === generation.current) update(value); })
      .finally(() => { if (active) setRestoring(false); });
    setSessionRenewal(renew);
    return () => { active = false; setSessionRenewal(null); setApiAccessToken(null); };
  }, []);
  useEffect(() => {
    if (!session) return;
    const timer = setTimeout(() => { renew().catch(() => {}); }, Math.max(1000, session.expiresAt - Date.now() - 60000));
    const listener = AppState.addEventListener('change', state => {
      if (state === 'active' && (sessionRef.current?.expiresAt || 0) <= Date.now() + 60000) renew().catch(() => {});
    });
    return () => { clearTimeout(timer); listener.remove(); };
  }, [session]);
  const refreshProfile = async (): Promise<UserAccount> => {
    const current = sessionRef.current;
    if (!current) throw new Error('Vui lòng đăng nhập lại.');
    const version = generation.current;
    const next = await reloadUserProfile(current);
    if (version !== generation.current) throw new Error('Phiên đăng nhập đã đóng.');
    update(next);
    return next.user;
  };
  return <AuthContext.Provider value={{ session, restoring, signOut, refreshProfile,
    signIn: async (username, password) => {
      const version = ++generation.current;
      const next = await login(username, password);
      if (version === generation.current) update(next);
    } }}>
    {children}
  </AuthContext.Provider>;
}
export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('Thiếu AuthProvider.');
  return value;
}
