import React, { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    let active = true;

    const restoreSession = async () => {
      try {
        const res = await api('/auth/me');
        if (!active) return;
        if (res?.user) {
          setUser(res.user);
        } else {
          setUser(null);
        }
      } catch (error) {
        if (active) setUser(null);
      }
    };

    restoreSession();

    return () => {
      active = false;
    };
  }, []);

  const login = (userObj) => {
    setUser(userObj ?? null);
  };

  const logout = async () => {
    try {
      await api('/auth/logout', { method: 'POST' });
    } catch (error) {
      console.error('Failed to log out', error);
    } finally {
      setUser(null);
    }
  };

  return React.createElement(AuthContext.Provider, { value: { user, login, logout } }, children);
}

export function useAuth() {
  return useContext(AuthContext);
}
