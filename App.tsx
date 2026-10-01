import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import Login from './components/Login';
import Registro from './components/Registro';
import ProtectedRoute from './components/ProtectedRoute';
import MainApplication from './components/MainApplication';
import LandingPage from './components/LandingPage';
import AdminDashboard from './components/AdminDashboard';
import GlobalDynamicErrorModal from './components/GlobalDynamicErrorModal';
import SubscriptionRequiredModal from './components/SubscriptionRequiredModal';
import { initGlobalErrorTelemetry } from './services/errorTelemetryService';

const LandingRoute: React.FC = () => {
  return <LandingPage />;
};

const App: React.FC = () => {
  // Inicializar servicio de telemetría universal y protección de código
  useEffect(() => {
    // 1. Telemetría de errores no capturados
    initGlobalErrorTelemetry();

    // 2. Si estamos en localhost, permitir click derecho e inspección con normalidad
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return;
    }

    // 3. Deshabilitar Click Derecho en producción
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    // 4. Deshabilitar Atajos de Teclado de Inspección
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && e.key === 'I') ||
        (e.ctrlKey && e.shiftKey && e.key === 'J') ||
        (e.ctrlKey && e.shiftKey && e.key === 'C') ||
        (e.ctrlKey && e.key === 'u')
      ) {
        e.preventDefault();
      }
    };

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <Router>
      <Routes>
        {/* 1. Portada Pública SaaS (Landing con oferta Skool a $14 USD) */}
        <Route path="/" element={<LandingRoute />} />

        {/* 2. Login para miembros autorizados */}
        <Route path="/login" element={<Login />} />

        {/* 3. Activación y verificación para nuevos alumnos de Skool */}
        <Route path="/registro" element={<Registro />} />

        {/* 4. Estudio Principal Protegido */}
        <Route
          path="/app"
          element={
            <ProtectedRoute>
              <MainApplication />
            </ProtectedRoute>
          }
        />

        {/* 5. Panel Administrativo & Notificaciones de Telegram */}
        <Route path="/admin" element={<AdminDashboard />} />

        {/* 6. Fallback a portada */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {/* Modal Dinámico Interceptor de Errores con Reporte a Telegram */}
      <GlobalDynamicErrorModal />

      {/* Modal Interceptor de Funciones Protegidas por Suscripción */}
      <SubscriptionRequiredModal />
    </Router>
  );
};

export default App;
