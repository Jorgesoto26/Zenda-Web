// src/components/BillingAlertBanner.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from './Icon';
import { useAuth } from '../context/AuthContext';
import { FormatMoneyDecimales } from '../utils/utilities';
import { useTranslation } from '../i18n';

export default function BillingAlertBanner({ className = '', onPress }) {
  const navigate = useNavigate();
  const { billingStatus, rol } = useAuth() || {};
  const { t } = useTranslation();

  if (!billingStatus) return null;

  const status = billingStatus.billing_status;
  if (!status || status === 'al_dia') return null;

  const diasPago = billingStatus.dias_para_pago ?? 0;
  const diasBloqueo = billingStatus.dias_para_bloqueo ?? 0;
  const total = billingStatus.factura_actual?.total ?? billingStatus.total_estimado ?? 0;
  const diaCorte = billingStatus.config?.dia_facturacion || 28;
  const isAdmin = rol === 'admin' || rol === 'superadmin';

  const handlePress = () => {
    if (onPress) {
      onPress();
      return;
    }
    if (isAdmin) {
      navigate('/admin-reportes?tab=facturacion');
    }
  };

  let bannerConfig = null;

  if (status === 'alerta_previa') {
    bannerConfig = {
      bg: 'bg-amber-50',
      border: 'border-amber-400',
      textColor: 'text-amber-900',
      icon: 'exclamation-triangle',
      iconColor: '#D97706',
      title: t('billing.banner_upcoming_title'),
      message: isAdmin
        ? t('billing.banner_upcoming_msg_admin', {
            days: Math.max(1, diasPago),
            day: diaCorte,
            amount: FormatMoneyDecimales(total, 'COP'),
          })
        : t('billing.banner_upcoming_msg_vendor', {
            days: Math.max(1, diasPago),
          }),
    };
  } else if (status === 'gracia_lectura') {
    bannerConfig = {
      bg: 'bg-red-50',
      border: 'border-[#EE272D]',
      textColor: 'text-red-900',
      icon: 'clock-o',
      iconColor: '#EE272D',
      title: t('billing.banner_overdue_title'),
      message: isAdmin
        ? t('billing.banner_grace_msg_admin', { days: diasBloqueo })
        : t('billing.banner_grace_msg_vendor'),
    };
  } else if (status === 'mora_critica') {
    bannerConfig = {
      bg: 'bg-red-100',
      border: 'border-red-600',
      textColor: 'text-red-950',
      icon: 'exclamation-circle',
      iconColor: '#DC2626',
      title: t('billing.banner_critical_title'),
      message: isAdmin
        ? t('billing.banner_critical_msg_admin', { days: diasBloqueo })
        : t('billing.banner_critical_msg_vendor'),
    };
  } else if (status === 'en_revision') {
    bannerConfig = {
      bg: 'bg-amber-100/80',
      border: 'border-amber-300',
      textColor: 'text-amber-900',
      icon: 'hourglass-half',
      iconColor: '#D97706',
      title: t('billing.banner_verification_title'),
      message: t('billing.banner_verification_msg'),
    };
  }

  if (!bannerConfig) return null;

  return (
    <div
      onClick={isAdmin ? handlePress : undefined}
      className={`mx-4 my-2 p-3 rounded-xl border flex items-center transition-all ${
        bannerConfig.bg
      } ${bannerConfig.border} ${
        isAdmin ? 'cursor-pointer hover:shadow-xs active:scale-[0.99]' : ''
      } ${className}`}
    >
      <div className="mr-2.5 shrink-0 flex items-center justify-center">
        <Icon name={bannerConfig.icon} size={16} color={bannerConfig.iconColor} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-xs font-bold leading-tight ${bannerConfig.textColor}`}>
          {bannerConfig.title}
        </p>
        <p className={`text-[11px] leading-snug font-medium mt-0.5 ${bannerConfig.textColor}`}>
          {bannerConfig.message}
        </p>
      </div>
      {isAdmin && status !== 'en_revision' && (
        <div className="ml-2 shrink-0">
          <Icon name="chevron-right" size={13} color={bannerConfig.iconColor} />
        </div>
      )}
    </div>
  );
}
