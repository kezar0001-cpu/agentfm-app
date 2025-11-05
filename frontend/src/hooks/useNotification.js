import { useState, useCallback } from 'react';

export function useNotification() {
  const [notification, setNotification] = useState({
    open: false,
    message: '',
    severity: 'info',
  });

  const showNotification = useCallback((message, severity = 'info') => {
    setNotification({
      open: true,
      message,
      severity,
    });
  }, []);

  const hideNotification = useCallback(() => {
    setNotification((prev) => ({ ...prev, open: false }));
  }, []);

  return {
    notification,
    showNotification,
    hideNotification,
    showSuccess: useCallback((msg) => showNotification(msg, 'success'), [showNotification]),
    showError: useCallback((msg) => showNotification(msg, 'error'), [showNotification]),
    showWarning: useCallback((msg) => showNotification(msg, 'warning'), [showNotification]),
    showInfo: useCallback((msg) => showNotification(msg, 'info'), [showNotification]),
  };
}

export default useNotification;
