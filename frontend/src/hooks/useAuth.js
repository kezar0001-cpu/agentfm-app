import React, { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  // On mount, try to restore token -> /api/auth/me
  useEffect(() => {
    const restore = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        // set header for this request
        const res = await api.request({ url: '/auth/me', method: 'get', headers: { Authorization: `Bearer ${token}` } });
        if (res?.data?.user) setUser(res.data.user);
      } catch (e) {
        // token invalid -> cleanup
        localStorage.removeItem('token');
        setUser(null);
      }
    };
    restore();
  }, []);

  const login = (userObj, token) => {
    setUser(userObj);
    try {
      if (token) localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(userObj));
    } catch (e) {
      // ignore
    }
  };

  const logout = () => {
    setUser(null);
    try {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    } catch (e) {
      // ignore
    }
  };

  return React.createElement(AuthContext.Provider, { value: { user, login, logout } }, children);
}

export function useAuth() {
  return useContext(AuthContext);
}
