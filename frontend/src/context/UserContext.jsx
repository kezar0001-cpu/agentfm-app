import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  getCurrentUser,
  refreshCurrentUser,
  setCurrentUser as persistUser,
  USER_UPDATED_EVENT,
} from '../lib/auth.js';

const UserContext = createContext(undefined);

function parseUser(value) {
  if (!value) return null;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

export function UserProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      return getCurrentUser();
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const handleStorage = (event) => {
      if (event.storageArea !== window.localStorage || event.key !== 'user') return;
      setUser(parseUser(event.newValue));
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const handleUserUpdated = (event) => {
      if (event?.detail !== undefined) {
        setUser(event.detail);
      } else {
        setUser(getCurrentUser());
      }
    };
    window.addEventListener(USER_UPDATED_EVENT, handleUserUpdated);
    return () => window.removeEventListener(USER_UPDATED_EVENT, handleUserUpdated);
  }, []);

  const updateUser = useCallback((next) => {
    if (typeof next === 'function') {
      setUser((prev) => {
        const resolved = next(prev);
        persistUser(resolved ?? null);
        return resolved ?? null;
      });
      return;
    }
    persistUser(next ?? null);
  }, []);

  const refreshUser = useCallback(async () => {
    const updated = await refreshCurrentUser();
    if (updated !== undefined) {
      setUser(updated);
    }
    return updated;
  }, []);

  const value = useMemo(
    () => ({
      user,
      setUser: updateUser,
      refreshUser,
    }),
    [user, updateUser, refreshUser],
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useCurrentUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useCurrentUser must be used within a UserProvider');
  }
  return context;
}
