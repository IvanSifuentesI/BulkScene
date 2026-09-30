import React from 'react';
import { Navigate } from 'react-router-dom';

interface ProtectedRouteProps {
  children?: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const session = localStorage.getItem('bulkscene_auth_session');

  // Si no hay sesión activa, redirige de forma inmediata y síncrona al login
  if (session !== 'active') {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;