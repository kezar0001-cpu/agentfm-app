import { useEffect, useMemo, useState } from 'react';

function readCache(key) {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    console.warn('Failed to read offline cache', error);
    return null;
  }
}

function writeCache(key, value) {
  if (typeof window === 'undefined') return;
  try {
    if (value === undefined) {
      window.localStorage.removeItem(key);
      return;
    }
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn('Failed to persist offline cache', error);
  }
}

export default function useOfflineCache(key, data, { enabled = true } = {}) {
  const [cached, setCached] = useState(() => readCache(key));
  const [isOnline, setIsOnline] = useState(() => {
    if (typeof navigator === 'undefined') return true;
    return navigator.onLine;
  });

  useEffect(() => {
    if (!enabled) return;
    if (data === undefined) return;
    writeCache(key, data);
    setCached(data);
  }, [key, data, enabled]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const lastSyncedAt = useMemo(() => {
    if (!cached?.meta?.generatedAt) return null;
    return new Date(cached.meta.generatedAt);
  }, [cached]);

  return {
    cached,
    isOnline,
    lastSyncedAt,
    hasCache: !!cached,
  };
}
