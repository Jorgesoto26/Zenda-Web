import React from 'react';
import { zendapp } from '../theme/zendappTheme';

export function AppleButton({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  icon,
  className = '',
  style = {},
  type = 'button',
}) {
  const isPrimary = variant === 'primary';
  const isDestructive = variant === 'destructive';
  const isCarbon = variant === 'carbon';

  let bgClass = 'bg-[#EE272D] text-white hover:bg-[#D81E24] shadow-sm active:scale-[0.98]';
  if (isCarbon) {
    bgClass = 'bg-[#1E1E1F] text-white hover:bg-[#2C2C2E] active:scale-[0.98]';
  } else if (isDestructive) {
    bgClass = 'bg-[#EE272D] text-white hover:bg-[#B91C1C] active:scale-[0.98]';
  } else if (variant === 'secondary') {
    bgClass = 'bg-white text-[#1E1E1F] border border-[#EAECF0] hover:bg-slate-50 active:scale-[0.98]';
  }

  return (
    <button
      type={type}
      onClick={onPress}
      disabled={disabled || loading}
      style={style}
      className={`h-[48px] px-5 rounded-xl font-bold text-[15px] transition-all flex items-center justify-center gap-2 select-none disabled:opacity-50 disabled:cursor-not-allowed ${bgClass} ${className}`}
    >
      {loading ? (
        <span className="h-5 w-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : (
        <>
          {icon}
          <span>{title}</span>
        </>
      )}
    </button>
  );
}

