import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider, useAuth } from './context/AuthContext';
import { I18nProvider } from './i18n';
import { AppAlertProvider } from './components/AppAlert';
import BottomNav from './components/BottomNav';

// Pantallas
import LoginScreen from './screens/LoginScreen';
import PinLockScreen from './components/PinLockScreen';
import SuspendedAccountScreen from './screens/billing/SuspendedAccountScreen';
import Payments from './screens/payments/Payments';
import CrearCliente from './screens/createClient/CrearCliente';
import Caja from './screens/caja/Caja';
import Movements from './screens/movements/Movements';
import CreditDetail from './screens/creditDetail/CreditDetail';
import {
  AdminUsuarios,
  AdminCartera,
  AdminCarteraDetalle,
  AdminCajas,
  AdminCajaDetalle,
  AdminMorosos,
  AdminReportes,
} from './screens/admin';

function PwaInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Si ya está corriendo como PWA independiente o standalone, no mostrar banner
    if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true) {
      return;
    }

    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  if (!showBanner || !deferredPrompt) return null;

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowBanner(false);
    }
    setDeferredPrompt(null);
  };

  return (
    <div className="bg-[#1E1E1F] text-white px-4 py-2.5 flex items-center justify-between border-b border-white/10 text-xs shadow-md animate-fadeIn sticky top-0 z-50">
      <div className="flex items-center space-x-2.5">
        <img src="/assets/icon-192.png" alt="Zendapp" className="w-6 h-6 rounded-md object-contain" />
        <span className="font-semibold text-slate-100">Instalar Zendapp en tu pantalla</span>
      </div>
      <div className="flex items-center space-x-2">
        <button
          type="button"
          onClick={handleInstallClick}
          className="px-3 py-1 rounded-xl bg-[#EE272D] hover:bg-[#d91f25] text-white font-bold transition-all shadow-sm active:scale-95 cursor-pointer"
        >
          Instalar
        </button>
        <button
          type="button"
          onClick={() => setShowBanner(false)}
          className="text-slate-400 hover:text-white p-1 cursor-pointer"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

function AppContent() {
  const { session, loading, rol, isSuspended, isPinLocked, hasPin } = useAuth();
  const location = useLocation();

  useEffect(() => {
    // Solicitar permiso de geolocalización al iniciar jornada en web
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        () => {},
        () => {},
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }
  }, [session]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F9FB] flex flex-col items-center justify-center">
        <div className="w-10 h-10 border-3 border-[#EE272D] border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
          Cargando Zendapp...
        </p>
      </div>
    );
  }

  // Si hay PIN configurado y la app está bloqueada, mostrar PinLockScreen
  if (hasPin && isPinLocked) {
    return <PinLockScreen />;
  }

  if (!session) {
    return (
      <>
        <PwaInstallBanner />
        <LoginScreen />
      </>
    );
  }

  // Si la cuenta está suspendida por facturación, bloquear el acceso a las funciones operativas
  if (isSuspended) {
    return (
      <div className="w-full min-h-screen bg-slate-900 flex justify-center">
        <div className="w-full max-w-[480px] min-h-screen relative bg-white shadow-2xl flex flex-col overflow-x-hidden">
          <PwaInstallBanner />
          <SuspendedAccountScreen />
        </div>
      </div>
    );
  }

  const isAdmin = rol === 'admin' || rol === 'superadmin';
  const isSubDetail =
    location.pathname.startsWith('/credit-detail') ||
    location.pathname.startsWith('/admin-cartera-detalle') ||
    location.pathname.startsWith('/admin-caja-detalle');

  return (
    <div className="w-full min-h-screen bg-slate-900 flex justify-center">
      {/* Marco Responsivo Móvil Fiel a React Native */}
      <div className="w-full max-w-[480px] min-h-screen relative shadow-2xl flex flex-col overflow-x-hidden bg-[#F8F9FB]">
        {/* Banner de Instalación PWA cuando el navegador móvil lo soporta */}
        <PwaInstallBanner />

        <Routes>
          {/* Redirección Inicial por Rol */}
          <Route
            path="/"
            element={<Navigate to={isAdmin ? '/admin-usuarios' : '/payments'} replace />}
          />

          {/* Rutas Vendedor */}
          <Route path="/payments" element={<Payments />} />
          <Route path="/create-client" element={<CrearCliente />} />
          <Route path="/caja" element={<Caja />} />
          <Route path="/movements" element={<Movements />} />
          <Route path="/credit-detail/:invoiceId" element={<CreditDetail />} />

          {/* Rutas Administrador */}
          <Route path="/admin-usuarios" element={<AdminUsuarios />} />
          <Route path="/admin-cartera" element={<AdminCartera />} />
          <Route path="/admin-cartera-detalle/:userId" element={<AdminCarteraDetalle />} />
          <Route path="/admin-cajas" element={<AdminCajas />} />
          <Route path="/admin-caja-detalle/:cajaId" element={<AdminCajaDetalle />} />
          <Route path="/admin-morosos" element={<AdminMorosos />} />
          <Route path="/admin-reportes" element={<AdminReportes />} />

          {/* Ruta de Respaldo */}
          <Route
            path="*"
            element={<Navigate to={isAdmin ? '/admin-usuarios' : '/payments'} replace />}
          />
        </Routes>

        {/* Barra de Navegación Inferior (Oculta en Vistas de Detalle Profundo) */}
        {!isSubDetail && <BottomNav />}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <I18nProvider>
        <AppAlertProvider>
          <BrowserRouter>
            <AppContent />
            <Toaster richColors position="top-center" />
          </BrowserRouter>
        </AppAlertProvider>
      </I18nProvider>
    </AuthProvider>
  );
}
