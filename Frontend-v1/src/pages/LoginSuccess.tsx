// src/pages/LoginSuccess.tsx
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import axios from 'axios';
import API_URL from '@/api';

const LoginSuccess = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/me`, {
          withCredentials: true,
        });

        if (res.data.email) {
          console.log('Logged in user:', res.data);
          login('session');
          navigate('/', { replace: true });
        } else {
          throw new Error('No user data received');
        }
      } catch (err) {
        console.error('User not authenticated:', err);
        navigate('/login', { replace: true });
      }
    };

    fetchUser();
  }, [login, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Completing your sign in...</p>
      </div>
    </div>
  );
};

export default LoginSuccess;