import { createContext, useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const validateToken = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const res = await api.get('/auth/me');
          setUser(res.data);
        } catch (err) {
          console.error('Validation failed:', err);
          localStorage.removeItem('token');
          navigate('/login');
        }
      } else {
        navigate('/login');
      }
      setLoading(false);
    };
    validateToken();
  }, [navigate]);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    localStorage.setItem('token', res.data.token);
    setUser(res.data.user);
    navigate('/dashboard');
  };

  // Add register, logout similarly

  return <AuthContext.Provider value={{ user, loading, login }}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
