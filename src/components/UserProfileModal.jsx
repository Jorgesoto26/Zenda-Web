// src/components/UserProfileModal.jsx
import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';
import Icon from './Icon';
import { useAuth } from '../context/AuthContext';
import { useTranslation, SUPPORTED_LANGUAGES } from '../i18n';
import { getUserDisplayName, getUserRoleLabel } from './UserHeaderBadge';
import { zendapp } from '../theme/zendappTheme';

export default function UserProfileModal({ visible, onClose }) {
  const { profile, signOut } = useAuth() || {};
  const { t, language, changeLanguage } = useTranslation();
  const [signingOut, setSigningOut] = useState(false);
  const [confirmSignOut, setConfirmSignOut] = useState(false);

  if (!visible) return null;
  if (typeof document === 'undefined') return null;

  const displayName = getUserDisplayName(profile);
  const roleLabel = getUserRoleLabel(profile?.rol);
  const initials =
    displayName
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0].toUpperCase())
      .join('') || 'U';

  const handleSelectLanguage = async (code) => {
    if (code === language) return;
    await changeLanguage(code);
    toast.success(t('profile.language_changed'));
  };

  const handleSignOutPress = async () => {
    setSigningOut(true);
    try {
      if (onClose) onClose();
      if (signOut) await signOut();
    } catch (err) {
      console.log('Error signing out:', err);
    } finally {
      setSigningOut(false);
      setConfirmSignOut(false);
    }
  };

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn">
      {/* Backdrop oscuro translúcido con desenfoque suave */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity cursor-pointer"
        onClick={onClose}
      />

      {/* Sheet / Modal Container */}
      <div
        className="relative w-full max-w-[440px] bg-white rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl z-10 max-h-[88vh] flex flex-col animate-slideUp overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle superior para sensación nativa móvil */}
        <div className="w-12 h-1 bg-slate-300 rounded-full mx-auto mb-3 sm:hidden" />

        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
          <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
            {t('profile.my_profile')}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <Icon name="times" size={16} />
          </button>
        </div>

        {/* Content Scroll */}
        <div className="overflow-y-auto py-3 space-y-4 flex-1 overscroll-contain">
          {/* Tarjeta de Información de Usuario */}
          <div className="flex items-center p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center text-white font-extrabold text-lg shadow-sm shrink-0"
              style={{ backgroundColor: zendapp.colors.primary }}
            >
              {initials}
            </div>
            <div className="ml-3.5 overflow-hidden flex-1">
              <p className="text-sm font-bold text-slate-900 truncate">{displayName}</p>
              <div className="inline-block mt-0.5">
                <span className="px-2 py-0.5 bg-red-100 text-[#EE272D] text-[10px] font-bold uppercase rounded-md tracking-wider">
                  {roleLabel}
                </span>
              </div>
              {profile?.email && (
                <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5 truncate">
                  <Icon name="envelope-o" size={12} className="text-slate-400 shrink-0" />
                  <span className="truncate">{profile.email}</span>
                </p>
              )}
              {(profile?.celular || profile?.telefono) && (
                <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5 truncate">
                  <Icon name="phone" size={12} className="text-slate-400 shrink-0" />
                  <span>{profile.celular || profile.telefono}</span>
                </p>
              )}
            </div>
          </div>

          {/* Sección de Selección de Idioma */}
          <div>
            <div className="flex items-center gap-2 mb-2 px-1">
              <Icon name="globe" size={15} color={zendapp.colors.primary} />
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                {t('languages.title')}
              </h3>
            </div>

            <div className="space-y-2">
              {SUPPORTED_LANGUAGES.map((lang) => {
                const isSelected = language === lang.code;
                return (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => handleSelectLanguage(lang.code)}
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
                    {isSelected ? (
                      <div className="w-5 h-5 rounded-full bg-[#EE272D] flex items-center justify-center text-white shrink-0">
                        <Icon name="check" size={11} />
                      </div>
                    ) : (
                      <div className="w-5 h-5 rounded-full border-2 border-slate-300 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Diálogo de Confirmación o Botón de Cerrar Sesión */}
          {confirmSignOut ? (
            <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-center space-y-3">
              <p className="text-xs font-bold text-red-900">{t('profile.sign_out_confirm')}</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmSignOut(false)}
                  className="flex-1 py-2.5 px-3 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="button"
                  onClick={handleSignOutPress}
                  disabled={signingOut}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-xs cursor-pointer"
                >
                  {signingOut ? '...' : t('common.logout')}
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmSignOut(true)}
              className="w-full mt-2 flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl border border-red-200 bg-red-50 text-red-600 hover:bg-red-100/80 font-bold text-xs transition-colors cursor-pointer"
            >
              <Icon name="sign-out" size={15} color="#DC2626" />
              <span>{t('profile.sign_out')}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
