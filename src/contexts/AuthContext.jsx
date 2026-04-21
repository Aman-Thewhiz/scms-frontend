import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../lib/apiClient';

const TOKEN_KEY = 'scms_token';
const USER_KEY = 'scms_user';

const AuthContext = createContext(null);

function parseTokenExpiryMs(token) {
  if (!token) {
    return null;
  }

  try {
    const payloadPart = token.split('.')[1];

    if (!payloadPart) {
      return null;
    }

    const normalizedPayload = payloadPart.replace(/-/g, '+').replace(/_/g, '/');
    const paddedPayload = normalizedPayload.padEnd(
      Math.ceil(normalizedPayload.length / 4) * 4,
      '='
    );
    const payload = JSON.parse(window.atob(paddedPayload));

    if (!payload?.exp) {
      return null;
    }

    return Number(payload.exp) * 1000;
  } catch {
    return null;
  }
}

function normalizeUser(rawUser) {
  if (!rawUser) {
    return null;
  }

  const normalized = {
    id: rawUser.id ?? rawUser.userId ?? null,
    name: typeof rawUser.name === 'string' ? rawUser.name.trim() : null,
    email: typeof rawUser.email === 'string' ? rawUser.email.trim().toLowerCase() : null,
    role: typeof rawUser.role === 'string' ? rawUser.role.trim().toLowerCase() : null,
    departmentId: rawUser.departmentId ?? null,
  };

  if (normalized.id == null || !normalized.name || !normalized.email || !normalized.role) {
    return null;
  }

  return normalized;
}

function getStoredUser() {
  const rawUser = localStorage.getItem(USER_KEY);

  if (!rawUser) {
    return null;
  }

  try {
    return normalizeUser(JSON.parse(rawUser));
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const navigate = useNavigate();
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState(() => getStoredUser());
  const [isLoading, setIsLoading] = useState(true);

  const clearAuthState = useCallback(
    (redirectToLogin = false) => {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      setToken(null);
      setUser(null);

      if (redirectToLogin) {
        navigate('/login', { replace: true });
      }
    },
    [navigate]
  );

  const login = useCallback(async (email, password, role) => {
    const response = await apiClient.post('/auth/login', {
      email: typeof email === 'string' ? email.trim().toLowerCase() : email,
      password,
      role: typeof role === 'string' ? role.trim().toLowerCase() : role,
    });

    const payload = response?.data?.data ?? null;
    const nextToken = payload?.token;
    const nextUser = normalizeUser(payload?.user);

    if (!nextToken || !nextUser) {
      throw new Error('Unexpected login response.');
    }

    localStorage.setItem(TOKEN_KEY, nextToken);
    localStorage.setItem(USER_KEY, JSON.stringify(nextUser));

    setToken(nextToken);
    setUser(nextUser);

    return nextUser;
  }, []);

  const logout = useCallback(() => {
    clearAuthState(true);
  }, [clearAuthState]);

  useEffect(() => {
    const handleUnauthorized = () => {
      clearAuthState(false);
    };

    window.addEventListener('scms:unauthorized', handleUnauthorized);

    return () => {
      window.removeEventListener('scms:unauthorized', handleUnauthorized);
    };
  }, [clearAuthState]);

  useEffect(() => {
    if (!token) {
      return undefined;
    }

    const expiresAt = parseTokenExpiryMs(token);

    if (!expiresAt) {
      return undefined;
    }

    const timeoutMs = expiresAt - Date.now();

    if (timeoutMs <= 0) {
      clearAuthState(true);
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      clearAuthState(true);
    }, timeoutMs);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [clearAuthState, token]);

  useEffect(() => {
    const storedToken = localStorage.getItem(TOKEN_KEY);

    if (!storedToken) {
      localStorage.removeItem(USER_KEY);
      setToken(null);
      setUser(null);
      setIsLoading(false);
      return;
    }

    setToken(storedToken);

    const expiresAt = parseTokenExpiryMs(storedToken);

    if (expiresAt && expiresAt <= Date.now()) {
      clearAuthState(false);
      setIsLoading(false);
      return;
    }

    const rehydrateUser = async () => {
      try {
        const response = await apiClient.get('/auth/me');
        const hydratedUser = normalizeUser(response?.data?.data);

        if (!hydratedUser) {
          throw new Error('Unexpected profile response.');
        }

        localStorage.setItem(USER_KEY, JSON.stringify(hydratedUser));
        setUser(hydratedUser);
      } catch {
        clearAuthState(false);
      } finally {
        setIsLoading(false);
      }
    };

    rehydrateUser();
  }, [clearAuthState]);

  const value = useMemo(() => {
    const isAuthenticated = Boolean(token && user);

    return {
      user,
      token,
      isLoading,
      isAuthenticated,
      login,
      logout,
    };
  }, [isLoading, login, logout, token, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider.');
  }

  return context;
}
