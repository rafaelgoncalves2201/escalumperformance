import { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { business, token, checkAuth } = useAuthStore();

  useEffect(() => {
    if (token && !business) {
      checkAuth();
    }
  }, [token, business, checkAuth]);

  if (!token) {
    return <Navigate to="/admin/login" replace />;
  }

  if (token && !business) {
    return <div className="flex items-center justify-center min-h-screen bg-black text-white">Carregando...</div>;
  }

  return <>{children}</>;
}
