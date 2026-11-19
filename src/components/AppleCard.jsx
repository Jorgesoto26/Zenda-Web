import React from 'react';

export function AppleCard({
  children,
  className = '',
  style = {},
  padded = true,
  bordered = true,
  shadow = true,
  onClick,
}) {
  return (
    <div
      onClick={onClick}
      style={style}
      className={`rounded-2xl bg-white/90 backdrop-blur-md transition-all ${
        bordered ? 'border border-slate-200/80' : ''
      } ${shadow ? 'shadow-[0_2px_8px_rgba(16,24,40,0.06)]' : ''} ${
        padded ? 'p-4' : ''
      } ${onClick ? 'cursor-pointer active:scale-[0.99]' : ''} ${className}`}
    >
      {children}
    </div>
  );
}

