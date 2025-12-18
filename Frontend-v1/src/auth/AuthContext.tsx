// src/auth/AuthContext.tsx
import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import axios from 'axios';
import { ResumeData } from '@/components/ResumeUpload';
import API_URL from '@/api';

export interface User {
  id: number;
  email: string;
  name: string;
  provider: string;
  pro: boolean;
  resume: any;
  trials: number;
}

interface AuthContextType {
  token: string | null;
  user: User | null;
  isLoading: boolean;
  login: (token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  token: null,
  user: null,
  isLoading: true,
  login: () => {},
  logout: () => {},
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = localStorage.getItem('token');
      if (storedToken) {
        setToken(storedToken);
      }

      try {
        const res = await axios.get(`${API_URL}/api/me`, {
          withCredentials: true,
        });

        if (res.data.email) {
          const rawUser = res.data;

          // Parse resumeJson if present
          // let parsedResume = null;
          // if (rawUser.resume && rawUser.resume.resumeJson) {
          //   try {
          //     parsedResume = JSON.parse(rawUser.resume.resumeJson);
          //   } catch (e) {
          //     console.error('Invalid resume JSON:', e);
          //   }
          // }

          // const formattedUser: User = {
          //   ...rawUser,
          //   resume: parsedResume,
          // };

          setUser(rawUser);
          setToken('session');
          localStorage.setItem('token', 'session');
        } else {
          setToken(null);
          setUser(null);
          localStorage.removeItem('token');
        }
      } catch (error) {
        console.error('Session check failed:', error);
        setToken(null);
        setUser(null);
        localStorage.removeItem('token');
      }

      setIsLoading(false);
    };

    initializeAuth();
  }, []);


  const login = (newToken: string) => {
    localStorage.setItem('token', newToken);
    setToken(newToken);
  };

  const logout = async () => {
    try {
      // Call backend logout endpoint to clear session
      await axios.post(`${API_URL}/api/logout`, {}, {
        withCredentials: true,
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Always clear frontend state, even if backend call fails
      localStorage.removeItem('token');
      setToken(null);
      setUser(null);
      
      // Force a complete page reload to ensure all state is cleared
      window.location.href = '/login';
    }
  };

  return (
    <AuthContext.Provider value={{ token, user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);