/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface AuthUser {
  id?: string;
  token: string;
  email: string;
  name?: string;
  role?: string;
  emails?: string[];
}

interface AuthContextType {
  user: AuthUser | null;
  login: (token: string, email: string, name?: string, role?: string, emails?: string[]) => void;
  logout: () => void;
  showModal: boolean;
  setShowModal: (show: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem('lms_user');
    if (storedUser) {
      try {
        const saved = JSON.parse(storedUser);
        if (!/^[a-f0-9]{64}$/.test(saved.token || '')) { localStorage.removeItem('lms_user'); return; }
        fetch('/api/lms/session', { headers: { Authorization: `Bearer ${saved.token}` } }).then(async response => {
          if (!response.ok) { if (response.status === 401) localStorage.removeItem('lms_user'); return; }
          const identity = await response.json();
          const current = { ...saved, ...identity }; setUser(current); localStorage.setItem('lms_user', JSON.stringify(current));
        }).catch(() => {});
      } catch (e) {
        console.error('Failed to parse lms_user from localStorage', e);
        localStorage.removeItem('lms_user');
      }
    }
  }, []);

  const login = (token: string, email: string, name?: string, role?: string, emails?: string[]) => {
    const u = { token, email, name, role, emails };
    setUser(u);
    localStorage.setItem('lms_user', JSON.stringify(u));
    fetch('/api/lms/session', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.ok ? r.json() : null).then(identity => { if (identity) { const current = { ...u, ...identity }; setUser(current); localStorage.setItem('lms_user', JSON.stringify(current)); } }).catch(() => {});
  };

  const logout = () => {
    fetch('/api/lms/logout', { method: 'POST', headers: { Authorization: `Bearer ${user?.token}` } }).catch(() => {});
    setUser(null);
    localStorage.removeItem('lms_user');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, showModal, setShowModal }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
