import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import API from '../services/api';

const AuthContext = createContext();
export const SESSION_MAX_AGE_MS = 30 * 60 * 1000; // 30 Minutes Absolute Session Expiry
export const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000; // 30 Minutes Inactivity Lock

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('pepsi_user');
    const loginTime = localStorage.getItem('pepsi_login_time');
    
    if (savedUser && loginTime) {
      if (Date.now() - Number(loginTime) > SESSION_MAX_AGE_MS) {
        localStorage.removeItem('pepsi_token');
        localStorage.removeItem('pepsi_user');
        localStorage.removeItem('pepsi_login_time');
        sessionStorage.setItem('pepsi_logout_reason', 'Your 30-minute session has expired for security. Please sign in again.');
        return null;
      }
      try {
        return JSON.parse(savedUser);
      } catch (e) {
        return null;
      }
    }
    return null;
  });

  const [loading, setLoading] = useState(true);
  const inactivityTimerRef = useRef(null);

  const logout = (reason = '') => {
    localStorage.removeItem('pepsi_token');
    localStorage.removeItem('pepsi_user');
    localStorage.removeItem('pepsi_login_time');
    if (reason) {
      sessionStorage.setItem('pepsi_logout_reason', reason);
    }
    setUser(null);
    if (window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
  };

  // Check live session validity with backend /auth/me
  useEffect(() => {
    const checkUser = async () => {
      const token = localStorage.getItem('pepsi_token');
      const loginTime = localStorage.getItem('pepsi_login_time');

      if (token && loginTime) {
        if (Date.now() - Number(loginTime) > SESSION_MAX_AGE_MS) {
          logout('Your 30-minute session has expired for security. Please sign in again.');
          setLoading(false);
          return;
        }
        try {
          const res = await API.get('/auth/me');
          setUser(res.data);
          localStorage.setItem('pepsi_user', JSON.stringify(res.data));
        } catch (err) {
          console.error('Session expired or invalid:', err);
          logout('Session invalid or expired. Please sign in again.');
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    };

    checkUser();
  }, []);

  // Inactivity Auto-Logout Timer (30 Minutes of zero mouse/keyboard/touch activity)
  useEffect(() => {
    if (!user) return;

    const resetInactivityTimer = () => {
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = setTimeout(() => {
        console.warn('User inactive for 30 minutes. Auto-logging out for security...');
        logout('You have been automatically logged out due to 30 minutes of inactivity.');
      }, INACTIVITY_TIMEOUT_MS);
    };

    const activityEvents = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart', 'pointerdown'];
    activityEvents.forEach(evt => window.addEventListener(evt, resetInactivityTimer, { passive: true }));
    resetInactivityTimer();

    return () => {
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
      activityEvents.forEach(evt => window.removeEventListener(evt, resetInactivityTimer));
    };
  }, [user]);

  const login = async (email, password) => {
    const res = await API.post('/auth/login', { email, password });
    const userData = res.data;
    const now = Date.now();
    
    sessionStorage.removeItem('pepsi_logout_reason');
    localStorage.setItem('pepsi_token', userData.token);
    localStorage.setItem('pepsi_user', JSON.stringify(userData));
    localStorage.setItem('pepsi_login_time', now.toString());
    
    setUser(userData);
    return userData;
  };

  return (
    <AuthContext.Provider value={{ user, setUser, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
