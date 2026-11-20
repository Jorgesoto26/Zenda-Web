// src/components/PinLockScreen.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Icon from './Icon';
import { zendapp } from '../theme/zendappTheme';
import { appAlert } from './AppAlert';
import {
  verifyPin,
  savePin,
  hasConfiguredPin,
  getInactivityTimeout,
  setInactivityTimeout,
} from '../services/pinService';
import CamouflageCalculator from './CamouflageCalculator';
import { useAuth } from '../context/AuthContext';
import { AuthService } from '../services/services';

const TIMEOUT_OPTIONS = [
  { label: 'Inmediato', value: 0 },
  { label: '1 min', value: 1 },
  { label: '5 min', value: 5 },
  { label: '15 min', value: 15 },
  { label: '30 min', value: 30 },
];

export default function PinLockScreen() {
  const { session, profile, setAuthSession, signOut, unlockApp } = useAuth();
  const [pin, setPin] = useState('');
  const [showCalculator, setShowCalculator] = useState(false);
  const [secretModalVisible, setSecretModalVisible] = useState(false);
  const [isShaking, setIsShaking] = useState(false);

  // Estados modal secreto
  const [secretEmail, setSecretEmail] = useState('');
  const [secretPassword, setSecretPassword] = useState('');
  const [showSecretPassword, setShowSecretPassword] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [selectedTimeout, setSelectedTimeout] = useState(5);
  const [savingSecret, setSavingSecret] = useState(false);

  const longPressTimerRef = useRef(null);

  useEffect(() => {
    (async () => {
      const t = await getInactivityTimeout();
      setSelectedTimeout(t);
    })();
  }, []);

  const triggerShake = useCallback(() => {
    setIsShaking(true);
    setTimeout(() => {
      setIsShaking(false);
    }, 400);
  }, []);

  // Manejo de pulsación numérica
  const handlePressDigit = useCallback(
    async (digit) => {
      if (pin.length >= 5) return;
      const nextPin = pin + digit;
      setPin(nextPin);

      // Cuando se completan los 5 dígitos
      if (nextPin.length === 5) {
        const isValid = await verifyPin(nextPin);
        if (isValid) {
          if (session) {
            unlockApp();
            return;
          }

          // Si no hay sesión en memoria, intentar restaurar perfil en caché
          try {
            const cached = localStorage.getItem('cached_profile');
            if (cached) {
              const prof = JSON.parse(cached);
              setAuthSession({ user: { id: prof?.id || 'cached_user', email: prof?.email } }, prof);
              unlockApp();
              return;
            }
          } catch {}

          // Si no hay datos, abrir modal secreto para vincular credenciales
          setSecretModalVisible(true);
        } else {
          // PIN INCORRECTO: Sacudir y activar MODO CALCULADORA (Camuflaje / Despiste)
          triggerShake();
          setTimeout(() => {
            setPin('');
            setShowCalculator(true);
          }, 350);
        }
      }
    },
    [pin, session, unlockApp, setAuthSession, triggerShake]
  );

  const handleBackspace = useCallback(() => {
    setPin((prev) => (prev.length > 0 ? prev.slice(0, -1) : ''));
  }, []);

  const handleClear = useCallback(() => {
    setPin('');
  }, []);

  // Soporte de teclado físico (números, backspace, escape)
  useEffect(() => {
    if (showCalculator || secretModalVisible) return;

    const handleKeyDown = (e) => {
      if (e.key >= '0' && e.key <= '9') {
        handlePressDigit(e.key);
      } else if (e.key === 'Backspace') {
        handleBackspace();
      } else if (e.key === 'Escape' || e.key === 'c' || e.key === 'C') {
        handleClear();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showCalculator, secretModalVisible, handlePressDigit, handleBackspace, handleClear]);

  // Apertura del modal secreto (pulsación sostenida o doble clic)
  const handleSecretTrigger = useCallback(() => {
    if (session?.user?.email) {
      setSecretEmail(session.user.email);
    }
    setSecretModalVisible(true);
  }, [session]);

  const startSecretPress = () => {
    longPressTimerRef.current = setTimeout(() => {
      handleSecretTrigger();
    }, 800);
  };

  const cancelSecretPress = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
    }
  };

  // Guardado de configuración en el modal secreto
  const handleSaveSecretConfig = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setSavingSecret(true);
    try {
      let authUser = session?.user;

      // 1. Si se ingresó correo y contraseña, autenticar con AuthService
      if (secretEmail.trim() && secretPassword.trim()) {
        const res = await AuthService(null, secretEmail.trim(), secretPassword.trim());
        if (!res.success) {
          appAlert('Error de autenticación', res.message || 'Credenciales inválidas');
          setSavingSecret(false);
          return;
        }
        if (res.session) {
          authUser = res.session.user;
          setAuthSession(res.session, res.profile);
        }
      }

      // 2. Si se ingresó nuevo PIN, validar y guardar
      if (newPin.trim()) {
        if (newPin.trim().length !== 5 || isNaN(Number(newPin.trim()))) {
          appAlert('PIN inválido', 'El PIN de seguridad debe contener exactamente 5 dígitos numéricos.');
          setSavingSecret(false);
          return;
        }
        await savePin(newPin.trim());
      }

      // 3. Guardar timeout de inactividad
      await setInactivityTimeout(selectedTimeout);

      setSecretModalVisible(false);
      setSecretPassword('');
      setNewPin('');
      appAlert('Configuración guardada', 'Parámetros de acceso y seguridad actualizados correctamente.');

      // Si tenemos usuario y PIN configurado, desbloquear directamente
      const hasPinNow = await hasConfiguredPin();
      if (hasPinNow && (session || authUser)) {
        unlockApp();
      }
    } catch (err) {
      appAlert('Error', err.message || 'No fue posible guardar la configuración');
    } finally {
      setSavingSecret(false);
    }
  };

  const handleSignOutSecret = () => {
    appAlert(
      'Cerrar sesión',
      '¿Deseas desvincular este dispositivo y cerrar la sesión actual?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Desvincular',
          onPress: async () => {
            setSecretModalVisible(false);
            if (signOut) await signOut();
          },
        },
      ]
    );
  };

  // Si se activó la calculadora señuelo por código incorrecto:
  if (showCalculator) {
    return (
      <CamouflageCalculator
        onExit={() => {
          setShowCalculator(false);
          setPin('');
        }}
      />
    );
  }

  return (
    <div className="relative min-h-screen flex flex-col justify-between items-center overflow-x-hidden bg-[#F8F9FB] select-none">
      {/* Fondo institucional exclusivo de Login / PIN */}
      <img
        src="/assets/fondoApp.png"
        alt="Fondo Zendapp"
        className="absolute inset-0 w-full h-full object-cover pointer-events-none"
      />

      <div className="relative z-10 w-full max-w-[440px] px-6 py-8 flex flex-col justify-between min-h-screen animate-fadeIn">
        {/* Header con Logotipo */}
        <div className="flex flex-col items-center mt-6 text-center">
          <div className="w-20 h-20 rounded-3xl bg-white shadow-xl flex items-center justify-center p-3 mb-3 border border-slate-100">
            <img
              src="/assets/logo.png"
              alt="Logo Zendapp"
              className="w-full h-full object-contain"
            />
          </div>
          <h1 className="text-2xl font-black tracking-wider text-[#1E1E1F]">ZENDAPP</h1>
          <p className="text-sm font-bold text-slate-800 mt-1">
            {profile?.nombre ? `Hola, ${profile.nombre}` : 'Introduce tu PIN de acceso'}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">
            Código de 5 dígitos para desbloquear
          </p>
        </div>

        {/* Indicador de 5 Dígitos */}
        <div
          className={`flex justify-center items-center gap-4 my-6 transition-transform ${
            isShaking ? 'animate-shake' : ''
          }`}
        >
          {[0, 1, 2, 3, 4].map((idx) => {
            const isFilled = pin.length > idx;
            return (
              <div
                key={idx}
                className={`w-4 h-4 rounded-full border-2 transition-all duration-200 ${
                  isFilled
                    ? 'bg-[#EE272D] border-[#EE272D] scale-125 shadow-md shadow-red-500/30'
                    : 'bg-white/80 border-slate-300'
                }`}
              />
            );
          })}
        </div>

        {/* Teclado Numérico Ergonómico */}
        <div className="w-full max-w-[320px] mx-auto space-y-3 mb-4">
          {/* Fila 1 */}
          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => handlePressDigit(String(num))}
                className="h-16 rounded-2xl bg-white/95 backdrop-blur-md border border-slate-200/80 text-2xl font-bold text-[#1E1E1F] shadow-sm hover:bg-slate-50 active:scale-95 transition-all cursor-pointer flex items-center justify-center"
              >
                {num}
              </button>
            ))}
          </div>

          {/* Fila 2 */}
          <div className="grid grid-cols-3 gap-3">
            {[4, 5, 6].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => handlePressDigit(String(num))}
                className="h-16 rounded-2xl bg-white/95 backdrop-blur-md border border-slate-200/80 text-2xl font-bold text-[#1E1E1F] shadow-sm hover:bg-slate-50 active:scale-95 transition-all cursor-pointer flex items-center justify-center"
              >
                {num}
              </button>
            ))}
          </div>

          {/* Fila 3 */}
          <div className="grid grid-cols-3 gap-3">
            {[7, 8, 9].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => handlePressDigit(String(num))}
                className="h-16 rounded-2xl bg-white/95 backdrop-blur-md border border-slate-200/80 text-2xl font-bold text-[#1E1E1F] shadow-sm hover:bg-slate-50 active:scale-95 transition-all cursor-pointer flex items-center justify-center"
              >
                {num}
              </button>
            ))}
          </div>

          {/* Fila 4: Limpiar, 0, Borrar */}
          <div className="grid grid-cols-3 gap-3">
            <button
              type="button"
              onClick={handleClear}
              className="h-16 rounded-2xl bg-white/70 backdrop-blur-md border border-slate-200/80 text-sm font-extrabold text-slate-500 shadow-sm hover:bg-slate-50 active:scale-95 transition-all cursor-pointer flex items-center justify-center"
            >
              C
            </button>
            <button
              type="button"
              onClick={() => handlePressDigit('0')}
              className="h-16 rounded-2xl bg-white/95 backdrop-blur-md border border-slate-200/80 text-2xl font-bold text-[#1E1E1F] shadow-sm hover:bg-slate-50 active:scale-95 transition-all cursor-pointer flex items-center justify-center"
            >
              0
            </button>
            <button
              type="button"
              onClick={handleBackspace}
              className="h-16 rounded-2xl bg-white/70 backdrop-blur-md border border-slate-200/80 text-slate-600 shadow-sm hover:bg-slate-50 active:scale-95 transition-all cursor-pointer flex items-center justify-center"
            >
              <Icon name="chevron-left" size={16} />
            </button>
          </div>
        </div>

        {/* Footer con versión (Pulsación prolongada o doble clic para configuración secreta) */}
        <div className="flex flex-col items-center text-center pb-2">
          <div
            className="cursor-pointer py-2 px-4 rounded-xl hover:bg-slate-200/40 transition-colors"
            onMouseDown={startSecretPress}
            onMouseUp={cancelSecretPress}
            onTouchStart={startSecretPress}
            onTouchEnd={cancelSecretPress}
            onDoubleClick={handleSecretTrigger}
            title="Mantén presionado para configuración de acceso"
          >
            <p className="text-[11px] text-slate-400 font-medium tracking-wide">
              Zendapp Web v1.0.0 · Acceso Seguro
            </p>
          </div>
        </div>
      </div>

      {/* MODAL SECRETO DE CONFIGURACIÓN DE ACCESO */}
      {secretModalVisible &&
        typeof document !== 'undefined' &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 animate-fadeIn">
            <div
              className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl border border-slate-100 animate-slideUp max-h-[90vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-12 h-1 bg-slate-300 rounded-full mx-auto mb-3 sm:hidden" />

              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4 shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-red-50 text-[#EE272D] flex items-center justify-center">
                    <Icon name="shield" size={16} />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-[#1E1E1F]">
                      Configuración de Acceso
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Vincular usuario y parámetros de seguridad
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSecretModalVisible(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 cursor-pointer"
                >
                  <Icon name="times" size={16} />
                </button>
              </div>

              <form onSubmit={handleSaveSecretConfig} className="overflow-y-auto space-y-4 pr-1 flex-1">
                {/* Sección Credenciales */}
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-2">
                    Credenciales de Usuario
                  </span>
                  <div className="space-y-2.5">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                        Correo Electrónico
                      </label>
                      <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                        <Icon name="envelope" size={13} className="text-slate-400 mr-2" />
                        <input
                          type="email"
                          placeholder="ejemplo@zendapp.com"
                          value={secretEmail}
                          onChange={(e) => setSecretEmail(e.target.value)}
                          className="w-full bg-transparent text-xs text-slate-800 font-semibold outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                        Contraseña de Acceso
                      </label>
                      <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                        <Icon name="lock" size={14} className="text-slate-400 mr-2" />
                        <input
                          type={showSecretPassword ? 'text' : 'password'}
                          placeholder="Ingresa la contraseña para vincular"
                          value={secretPassword}
                          onChange={(e) => setSecretPassword(e.target.value)}
                          className="w-full bg-transparent text-xs text-slate-800 font-semibold outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => setShowSecretPassword(!showSecretPassword)}
                          className="text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                        >
                          <Icon name={showSecretPassword ? 'eye' : 'eye-slash'} size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sección PIN */}
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-2">
                    PIN de 5 Dígitos para Desbloqueo
                  </span>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Nuevo PIN (5 dígitos)
                    </label>
                    <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                      <Icon name="key" size={13} className="text-slate-400 mr-2" />
                      <input
                        type="password"
                        maxLength={5}
                        placeholder="Ej. 12345"
                        value={newPin}
                        onChange={(e) => setNewPin(e.target.value.replace(/[^0-9]/g, '').slice(0, 5))}
                        className="w-full bg-transparent text-xs text-slate-800 font-semibold outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Sección Inactividad */}
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-2">
                    Tiempo de Inactividad para Bloqueo
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {TIMEOUT_OPTIONS.map((opt) => {
                      const isSel = selectedTimeout === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setSelectedTimeout(opt.value)}
                          className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                            isSel
                              ? 'border-[#EE272D] bg-red-50 text-[#EE272D] shadow-xs'
                              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Botones de acción */}
                <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                  {session && (
                    <button
                      type="button"
                      onClick={handleSignOutSecret}
                      className="px-3.5 py-2.5 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100/80 text-red-600 font-bold text-xs transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <Icon name="sign-out" size={13} />
                      <span>Desvincular</span>
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={savingSecret}
                    className="flex-1 py-2.5 rounded-xl bg-[#EE272D] hover:bg-[#d91f25] text-white font-bold text-xs shadow-md disabled:opacity-50 flex items-center justify-center cursor-pointer transition-colors"
                  >
                    {savingSecret ? (
                      <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    ) : (
                      'Guardar Parámetros'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
