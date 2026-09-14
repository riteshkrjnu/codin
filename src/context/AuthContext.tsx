/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface AuthUser {
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
        setUser(JSON.parse(storedUser));
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
  };

  const logout = () => {
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
