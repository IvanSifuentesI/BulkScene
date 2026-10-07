import React from 'react';
import { Navigate } from 'react-router-dom';

interface ProtectedRouteProps {
  children?: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const session = localStorage.getItem('bulkscene_auth_session');
  const isSubscribed = localStorage.getItem('bulkscene_subscription_active');
  const email = (localStorage.getItem('bulkscene_user_email') || '').toLowerCase().trim();

  // Excepción administrativa
  if ((email === 'admin@bulkscene.ai' || email === 'ivansifuentes340@gmail.com' || localStorage.getItem('bulkscene_admin_authenticated') === 'true' || localStorage.getItem('bulkscene_admin_mode') === 'true') && session === 'active') {
    return <>{children}</>;
  }

  // Si no hay sesión activa o la suscripción no está activa, expulsar inmediatamente al login
  if (session !== 'active' || isSubscribed !== 'true') {
    localStorage.removeItem('bulkscene_auth_session');
    localStorage.removeItem('bulkscene_subscription_active');
    return <Navigate to="/login" replace />;
  }

  // Verificar si la fecha de expiración guardada ya venció
  const expDateStr = localStorage.getItem('bulkscene_expiration_date');
  if (expDateStr) {
    const expDate = new Date(expDateStr).getTime();
    if (!isNaN(expDate) && expDate < Date.now()) {
      localStorage.removeItem('bulkscene_auth_session');
      localStorage.removeItem('bulkscene_subscription_active');
      return <Navigate to="/login" replace />;
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;