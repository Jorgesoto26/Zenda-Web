// src/components/UserHeaderBadge.jsx
import React, { useState } from 'react';
import Icon from './Icon';
import { useAuth } from '../context/AuthContext';
import { zendapp } from '../theme/zendappTheme';
import UserProfileModal from './UserProfileModal';

export const getUserDisplayName = (profile) => {
  if (!profile) return 'Usuario';
  const nombre = (profile.nombre || '').trim();
  const apellidos = (profile.apellidos || profile.apellido || '').trim();
  if (nombre && apellidos) return `${nombre} ${apellidos}`;
  if (nombre) return nombre;
  if (apellidos) return apellidos;
  return 'Usuario';
};

export const getUserRoleLabel = (rol) => {
  const r = String(rol || 'vendedor').toLowerCase().trim();
  if (r === 'admin') return 'Administrador';
  if (r === 'superadmin') return 'Superadmin';
  if (r === 'cliente') return 'Cliente';
  return 'Vendedor';
};

export default function UserHeaderBadge({
  variant = 'inline',
  className = '',
  textClassName = '',
  showIcon = true,
}) {
  const { profile } = useAuth() || {};
  const [modalVisible, setModalVisible] = useState(false);
  const displayName = getUserDisplayName(profile);
  const roleLabel = getUserRoleLabel(profile?.rol);

  const badgeContent =
    variant === 'pill' ? (
      <button
        type="button"
        onClick={() => setModalVisible(true)}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-50/90 border border-red-200 hover:bg-red-100/90 transition-all cursor-pointer shadow-xs ${className}`}
      >
        {showIcon && (
          <div
            className="w-4 h-4 rounded-full flex items-center justify-center text-white shrink-0"
            style={{ backgroundColor: zendapp.colors.primary }}
          >
            <Icon name="user" size={10} color="#FFFFFF" />
          </div>
        )}
        <span
          className={`text-[11px] font-bold text-slate-900 max-w-[130px] truncate ${textClassName}`}
        >
          {displayName}
        </span>
        <span className="w-1 h-1 rounded-full bg-slate-400 shrink-0" />
        <span
          className="text-[10px] font-semibold uppercase tracking-wider"
          style={{ color: zendapp.colors.primary }}
        >
          {roleLabel}
        </span>
        <Icon name="angle-down" size={12} color={zendapp.colors.primary} />
      </button>
    ) : (
      <button
        type="button"
        onClick={() => setModalVisible(true)}
        className={`inline-flex items-center text-left hover:opacity-80 transition-opacity cursor-pointer ${className}`}
      >
        {showIcon && (
          <Icon
            name="user-circle"
            size={13}
            color={zendapp.colors.primary}
            className="mr-1.5 shrink-0"
          />
        )}
        <span className={`text-xs text-slate-600 font-medium truncate ${textClassName}`}>
          <span className="font-bold text-slate-900">{displayName}</span>
          <span className="text-slate-500"> · {roleLabel}</span>
        </span>
        <Icon name="angle-down" size={11} color="#98A2B3" className="ml-1 shrink-0" />
      </button>
    );

  return (
    <>
      {badgeContent}
      <UserProfileModal visible={modalVisible} onClose={() => setModalVisible(false)} />
    </>
  );
}
