import React from 'react';
import { NavLink } from 'react-router-dom';
import Icon from './Icon';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../i18n';

export const MENU_CONFIG = {
  vendedor: [
    { key: 'payments', titleKey: 'menu.payments', path: '/payments', icon: 'money' },
    { key: 'create_sale', titleKey: 'menu.create_sale', path: '/create-client', icon: 'user-plus' },
    { key: 'movements', titleKey: 'menu.movements', path: '/movements', icon: 'exchange' },
    { key: 'caja', titleKey: 'menu.caja', path: '/caja', icon: 'shopping-cart' },
  ],
  admin: [
    { key: 'usuarios', titleKey: 'menu.users', path: '/admin-usuarios', icon: 'users' },
    { key: 'cartera', titleKey: 'menu.cartera', path: '/admin-cartera', icon: 'briefcase' },
    { key: 'cajas', titleKey: 'menu.caja', path: '/admin-cajas', icon: 'archive' },
    { key: 'morosos', titleKey: 'menu.morosos', path: '/admin-morosos', icon: 'exclamation-triangle' },
    { key: 'reportes', titleKey: 'menu.reports', path: '/admin-reportes', icon: 'bar-chart' },
  ],
  cliente: [
    { key: 'payments', titleKey: 'menu.payments', path: '/payments', icon: 'money' },
    { key: 'caja', titleKey: 'menu.caja', path: '/caja', icon: 'shopping-cart' },
  ],
};

export default function BottomNav() {
  const { rol } = useAuth();
  const { t } = useTranslation();
  const perfil = rol === 'admin' ? 'admin' : rol === 'cliente' ? 'cliente' : 'vendedor';
  const items = MENU_CONFIG[perfil] || MENU_CONFIG.vendedor;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-lg border-t border-slate-200/80 shadow-[0_-2px_10px_rgba(16,24,40,0.05)] pb-[env(safe-area-inset-bottom)]"
      style={{
        maxWidth: '480px',
        margin: '0 auto',
      }}
    >
      <div className="h-[64px] flex items-center justify-around px-2">
        {items.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center flex-1 h-full transition-all group ${
                isActive ? 'text-[#EE272D]' : 'text-[#98A2B3] hover:text-slate-700'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <div className="h-7 w-9 flex items-center justify-center">
                  <Icon
                    name={item.icon}
                    size={20}
                    color={isActive ? '#EE272D' : '#98A2B3'}
                  />
                </div>
                <span
                  className={`text-[11px] font-bold tracking-tight transition-colors ${
                    isActive ? 'text-[#EE272D]' : 'text-[#98A2B3]'
                  }`}
                >
                  {t(item.titleKey)}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
