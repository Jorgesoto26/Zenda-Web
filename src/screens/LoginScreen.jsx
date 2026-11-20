import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../lib/supabase';
import Icon from '../components/Icon';
import { AuthService } from '../services/services';
import { useAuth } from '../context/AuthContext';
import { useTranslation, SUPPORTED_LANGUAGES } from '../i18n';
import { zendapp } from '../theme/zendappTheme';
import { appAlert } from '../components/AppAlert';
import { hasConfiguredPin, savePin } from '../services/pinService';

export default function LoginScreen() {
  const { setAuthSession, refreshPinStatus } = useAuth();
  const { t, language, changeLanguage, currentLanguage } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [langModalVisible, setLangModalVisible] = useState(false);
  const [pinSetupModalVisible, setPinSetupModalVisible] = useState(false);
  const [initialPin, setInitialPin] = useState('');
  const [pendingAuth, setPendingAuth] = useState(null);
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [regEmailFocused, setRegEmailFocused] = useState(false);
  const [regPasswordFocused, setRegPasswordFocused] = useState(false);

  useEffect(() => {
    // Solicitar permiso de geolocalización en navegador
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        () => {},
        () => {},
        { enableHighAccuracy: true, timeout: 8000 }
      );
    }
  }, []);

  const handleLogin = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!email.trim() || !password.trim()) {
      return appAlert(t('common.error'), t('login.credentials_sub'));
    }
    setLoading(true);
    try {
      const result = await AuthService(null, email, password);
      if (!result.success) {
        const title =
          result.message && result.message.toLowerCase().includes('cerrada')
            ? t('common.error')
            : t('common.error');
        appAlert(title, result.message);
      } else if (result.session) {
        const pinExists = await hasConfiguredPin();
        if (!pinExists) {
          setPendingAuth({
            session: result.session,
            profile: result.profile,
          });
          setPinSetupModalVisible(true);
        } else {
          setAuthSession(result.session, result.profile);
        }
      }
    } catch (e) {
      appAlert(t('common.error'), e.message || t('login.credentials_sub'));
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmPinSetup = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const cleanPin = initialPin.trim();
    if (!cleanPin || cleanPin.length !== 5 || isNaN(Number(cleanPin))) {
      return appAlert('PIN incompleto', 'Debes ingresar exactamente 5 dígitos numéricos.');
    }
    setLoading(true);
    try {
      await savePin(cleanPin);
      if (refreshPinStatus) await refreshPinStatus();
      setPinSetupModalVisible(false);
      setInitialPin('');
      if (pendingAuth) {
        setAuthSession(pendingAuth.session, pendingAuth.profile);
      }
    } catch (err) {
      appAlert('Error', err.message || 'No se pudo guardar el PIN');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!regEmail.trim() || !regPassword.trim()) {
      return appAlert(t('common.error'), t('common.required_field'));
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email: regEmail.trim(),
        password: regPassword.trim(),
      });
      if (error) throw error;
      appAlert('¡Registro exitoso!', t('login.credentials_sub'));
      setModalVisible(false);
      setRegEmail('');
      setRegPassword('');
    } catch (error) {
      appAlert(t('common.error'), error.message || 'Error en registro');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col justify-center items-center overflow-x-hidden bg-[#F8F9FB] select-none">
      {/* Fondo institucional exclusivo de Login */}
      <img
        src="/assets/fondoApp.png"
        alt="Fondo Zendapp"
        className="absolute inset-0 w-full h-full object-cover pointer-events-none"
      />

      <div className="relative z-10 w-full max-w-[440px] px-6 py-8 flex flex-col justify-center min-h-screen animate-fadeIn">
        {/* Selector de Idioma en la parte superior derecha */}
        <div className="flex justify-end mb-2 w-full">
          <button
            type="button"
            onClick={() => setLangModalVisible(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/90 backdrop-blur-md border border-slate-200 text-xs font-bold text-slate-700 shadow-sm hover:bg-white transition-all cursor-pointer"
          >
            <span className="text-sm">{currentLanguage.flag}</span>
            <span>{currentLanguage.code.toUpperCase()}</span>
            <Icon name="angle-down" size={12} color="#667085" />
          </button>
        </div>

        {/* Header de Marca con Logo Oficial */}
        <div className="flex flex-col items-center mb-6 text-center">
          <div className="w-24 h-24 rounded-3xl bg-white shadow-xl flex items-center justify-center p-3 mb-3 border border-slate-100 transition-transform duration-500 hover:scale-105">
            <img
              src="/assets/logo.png"
              alt="Logo Zendapp"
              className="w-full h-full object-contain"
            />
          </div>
          <h1 className="text-3xl font-black tracking-wider text-[#1E1E1F]">ZENDAPP</h1>
          <p className="text-xs font-semibold text-slate-500 mt-1 uppercase tracking-widest">
            {t('login.header_tagline') || 'Gestión de Cartera & Caja'}
          </p>
        </div>

        {/* Tarjeta Principal de Inicio de Sesión */}
        <div className="bg-white/95 backdrop-blur-md rounded-3xl p-6 sm:p-7 shadow-2xl border border-white/70 transition-all duration-300">
          <div className="mb-5">
            <h2 className="text-2xl font-bold text-[#1E1E1F]">
              {t('login.welcome') || 'Bienvenido'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {t('login.credentials_sub') || 'Ingresa tus credenciales para acceder al sistema'}
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            {/* Input Correo */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                {t('login.email_label') || 'Correo electrónico'}
              </label>
              <div
                className={`flex items-center bg-slate-50 border rounded-2xl px-3.5 py-3 transition-all duration-200 ${
                  emailFocused
                    ? 'border-[#EE272D] ring-2 ring-[#EE272D]/20 bg-white'
                    : 'border-slate-200'
                }`}
              >
                <Icon
                  name="envelope"
                  size={16}
                  className={`mr-2.5 transition-colors ${
                    emailFocused ? 'text-[#EE272D]' : 'text-slate-400'
                  }`}
                />
                <input
                  type="email"
                  placeholder={t('login.email_placeholder') || 'tucorreo@ejemplo.com'}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setEmailFocused(true)}
                  onBlur={() => setEmailFocused(false)}
                  className="w-full bg-transparent text-sm text-[#1E1E1F] font-medium outline-none placeholder:text-slate-400"
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            {/* Input Contraseña */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                {t('login.password_label') || 'Contraseña'}
              </label>
              <div
                className={`flex items-center bg-slate-50 border rounded-2xl px-3.5 py-3 transition-all duration-200 ${
                  passwordFocused
                    ? 'border-[#EE272D] ring-2 ring-[#EE272D]/20 bg-white'
                    : 'border-slate-200'
                }`}
              >
                <Icon
                  name="lock"
                  size={17}
                  className={`mr-2.5 transition-colors ${
                    passwordFocused ? 'text-[#EE272D]' : 'text-slate-400'
                  }`}
                />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder={t('login.password_placeholder') || 'Ingresa tu contraseña'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setPasswordFocused(true)}
                  onBlur={() => setPasswordFocused(false)}
                  className="w-full bg-transparent text-sm text-[#1E1E1F] font-medium outline-none placeholder:text-slate-400"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="p-1 text-slate-400 hover:text-slate-600 transition-colors focus:outline-none cursor-pointer"
                >
                  <Icon name={showPassword ? 'eye' : 'eye-slash'} size={17} />
                </button>
              </div>
            </div>

            {/* Botón de Ingreso Oficial */}
            <button
              type="submit"
              disabled={loading}
              className={`w-full mt-2 py-3.5 px-4 rounded-2xl text-white font-bold text-sm tracking-wide shadow-lg shadow-red-500/25 transition-all duration-200 flex items-center justify-center space-x-2 active:scale-98 cursor-pointer ${
                loading
                  ? 'bg-slate-400 cursor-not-allowed shadow-none'
                  : 'bg-[#EE272D] hover:bg-[#d91f25]'
              }`}
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>{t('login.sign_in_btn') || 'Iniciar Sesión'}</span>
                  <Icon name="chevron-right" size={15} />
                </>
              )}
            </button>
          </form>

          {/* Enlace de Registro */}
          <div className="mt-5 text-center">
            <button
              type="button"
              onClick={() => setModalVisible(true)}
              className="text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
            >
              {t('login.no_account_text') || '¿No tienes una cuenta aún?'}{' '}
              <span className="font-bold text-[#EE272D] hover:underline">
                {t('login.create_account_link') || 'Crear cuenta'}
              </span>
            </button>
          </div>
        </div>

        {/* Footer de Seguridad y Versión */}
        <div className="mt-8 flex flex-col items-center text-center space-y-1.5">
          <div className="flex items-center space-x-1.5 text-[11px] font-medium text-slate-500">
            <Icon name="shield" size={13} className="text-slate-400" />
            <span>{t('login.security_notice') || 'Conexión segura y cifrada de extremo a extremo'}</span>
          </div>
          <p className="text-[10px] text-slate-400 font-medium">
            Zendapp Web v1.0.0 · Todos los derechos reservados
          </p>
        </div>
      </div>

      {/* Modal Selector de Idioma en Login */}
      {langModalVisible &&
        typeof document !== 'undefined' &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn">
            <div
              className="w-full max-w-[340px] bg-white rounded-3xl p-5 shadow-2xl border border-slate-100 animate-slideUp"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                <h3 className="text-sm font-extrabold text-slate-900 tracking-tight">
                  {t('languages.title')}
                </h3>
                <button
                  type="button"
                  onClick={() => setLangModalVisible(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-full cursor-pointer"
                >
                  <Icon name="times" size={16} />
                </button>
              </div>

              <div className="space-y-2">
                {SUPPORTED_LANGUAGES.map((lang) => {
                  const isSelected = language === lang.code;
                  return (
                    <button
                      key={lang.code}
                      type="button"
                      onClick={async () => {
                        await changeLanguage(lang.code);
                        setLangModalVisible(false);
                      }}
                      className={`w-full flex items-center p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'border-[#EE272D] bg-red-50/70 shadow-xs'
                          : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <span className="text-2xl mr-3">{lang.flag}</span>
                      <div className="flex-1">
                        <p
                          className={`text-sm ${
                            isSelected ? 'font-bold text-[#EE272D]' : 'font-semibold text-slate-800'
                          }`}
                        >
                          {lang.label}
                        </p>
                        <p className="text-[11px] text-slate-500">{lang.description}</p>
                      </div>
                      {isSelected && (
                        <div className="w-5 h-5 rounded-full bg-[#EE272D] flex items-center justify-center text-white shrink-0">
                          <Icon name="check" size={11} />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Modal Crear Cuenta */}
      {modalVisible &&
        typeof document !== 'undefined' &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 animate-fadeIn">
            <div
              className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-100 animate-slideUp"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto mb-4 sm:hidden" />
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xl font-bold text-slate-900">
                  {t('login.register_title') || 'Crear cuenta nueva'}
                </h3>
                <button
                  type="button"
                  onClick={() => setModalVisible(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 cursor-pointer"
                >
                  <Icon name="times" size={16} />
                </button>
              </div>
              <p className="text-xs text-slate-500 mb-5">
                {t('login.register_sub') || 'Ingresa tus datos para registrar tu cuenta en Zendapp'}
              </p>

              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    {t('login.email_label') || 'Correo electrónico'}
                  </label>
                  <div
                    className={`flex items-center bg-slate-50 border rounded-2xl px-3.5 py-3 transition-all ${
                      regEmailFocused
                        ? 'border-[#EE272D] ring-2 ring-[#EE272D]/20 bg-white'
                        : 'border-slate-200'
                    }`}
                  >
                    <Icon
                      name="envelope"
                      size={16}
                      className={`mr-2.5 ${regEmailFocused ? 'text-[#EE272D]' : 'text-slate-400'}`}
                    />
                    <input
                      type="email"
                      placeholder={t('login.email_placeholder') || 'tucorreo@ejemplo.com'}
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      onFocus={() => setRegEmailFocused(true)}
                      onBlur={() => setRegEmailFocused(false)}
                      className="w-full bg-transparent text-sm text-slate-900 font-medium outline-none"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    {t('login.password_label') || 'Contraseña'}
                  </label>
                  <div
                    className={`flex items-center bg-slate-50 border rounded-2xl px-3.5 py-3 transition-all ${
                      regPasswordFocused
                        ? 'border-[#EE272D] ring-2 ring-[#EE272D]/20 bg-white'
                        : 'border-slate-200'
                    }`}
                  >
                    <Icon
                      name="lock"
                      size={17}
                      className={`mr-2.5 ${regPasswordFocused ? 'text-[#EE272D]' : 'text-slate-400'}`}
                    />
                    <input
                      type={showRegPassword ? 'text' : 'password'}
                      placeholder={t('login.min_password_placeholder') || 'Mínimo 6 caracteres'}
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      onFocus={() => setRegPasswordFocused(true)}
                      onBlur={() => setRegPasswordFocused(false)}
                      className="w-full bg-transparent text-sm text-slate-900 font-medium outline-none"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegPassword(!showRegPassword)}
                      className="p-1 text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer"
                    >
                      <Icon name={showRegPassword ? 'eye' : 'eye-slash'} size={17} />
                    </button>
                  </div>
                </div>

                <div className="flex items-center space-x-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setModalVisible(false)}
                    className="flex-1 py-3 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm transition-colors cursor-pointer"
                  >
                    {t('common.cancel') || 'Cancelar'}
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-3 px-4 rounded-2xl bg-[#EE272D] hover:bg-[#d91f25] text-white font-bold text-sm shadow-md transition-colors flex items-center justify-center cursor-pointer"
                  >
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      t('login.register_btn') || 'Registrarse'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {/* Modal Creación de PIN Inicial al registrar o iniciar por primera vez */}
      {pinSetupModalVisible &&
        typeof document !== 'undefined' &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 animate-fadeIn">
            <div
              className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-100 animate-slideUp"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto mb-4 sm:hidden" />
              <div className="flex flex-col items-center text-center mb-5">
                <div className="w-12 h-12 rounded-2xl bg-red-50 text-[#EE272D] flex items-center justify-center mb-3">
                  <Icon name="key" size={22} />
                </div>
                <h3 className="text-xl font-bold text-slate-900">
                  Crea tu PIN de Seguridad
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Define un código de 5 dígitos para acceder rápidamente a Zendapp y proteger la información de tus clientes en este dispositivo.
                </p>
              </div>

              <form onSubmit={handleConfirmPinSetup} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    PIN de 5 dígitos numéricos
                  </label>
                  <div className="flex items-center bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-3 transition-all focus-within:border-[#EE272D] focus-within:ring-2 focus-within:ring-[#EE272D]/20">
                    <Icon name="lock" size={17} className="text-[#EE272D] mr-2.5" />
                    <input
                      type="password"
                      maxLength={5}
                      placeholder="Ingresa 5 números (ej. 12345)"
                      value={initialPin}
                      onChange={(e) => setInitialPin(e.target.value.replace(/[^0-9]/g, '').slice(0, 5))}
                      className="w-full bg-transparent text-sm text-slate-900 font-bold tracking-widest outline-none"
                      required
                      autoFocus
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={!initialPin || initialPin.length !== 5 || loading}
                    className="w-full py-3.5 px-4 rounded-2xl bg-[#EE272D] hover:bg-[#d91f25] text-white font-bold text-sm shadow-md transition-all flex items-center justify-center cursor-pointer disabled:opacity-50"
                  >
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      'Establecer PIN y Continuar'
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
