import { createContext, useContext, useState } from 'react';
import { api } from '../api/client.js';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);
export const homePathFor = (role) => (role === 'salesperson' ? '/sales' : '/customer');

export function AuthProvider({ children }) {
  const [session, setSession] = useState(() => {
    try { return JSON.parse(localStorage.getItem('crm_session')) || null; } catch { return null; }
  });

  const login = async (email, password, role) => {
    const data = await api('/auth/login', { method: 'POST', body: { email, password, role } });
    localStorage.setItem('crm_session', JSON.stringify(data));
    setSession(data);
    return data.user;
  };

  const register = async (userData) => {
    const data = await api('/auth/register', { method: 'POST', body: userData });
    localStorage.setItem('crm_session', JSON.stringify(data));
    setSession(data);
    return data.user;
  };

  const logout = async () => {
    try {
      if (session?.token) {
        await api('/auth/logout', { method: 'POST', token: session.token }).catch(() => {});
      }
    } finally {
      localStorage.removeItem('crm_session');
      setSession(null);
    }
  };

  const updateUser = (updatedUser) => {
    if (session) {
      const newSession = { ...session, user: { ...session.user, ...updatedUser } };
      localStorage.setItem('crm_session', JSON.stringify(newSession));
      setSession(newSession);
    }
  };

  return (
    <AuthContext.Provider value={{ user: session?.user, token: session?.token, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}
