import React, { useMemo } from 'react';
import Icon from './Icon';

export default function AnimatedSegmentedControl({
  options = [],
  selectedKey,
  onChange,
  className = '',
}) {
  const normalizedOptions = useMemo(() => {
    return options.map((opt) => {
      if (typeof opt === 'string') {
        return {
          key: opt,
          label: opt.charAt(0).toUpperCase() + opt.slice(1),
          icon: null,
          badge: null,
        };
      }
      return {
        key: opt.key,
        label: opt.label || opt.key,
        icon: opt.icon || null,
        badge: opt.badge !== undefined && opt.badge !== null ? opt.badge : null,
      };
    });
  }, [options]);

  const selectedIndex = normalizedOptions.findIndex((o) => o.key === selectedKey);
  const activeIndex = selectedIndex >= 0 ? selectedIndex : 0;
  const count = normalizedOptions.length;

  return (
    <div
      className={`relative flex items-center p-1 rounded-xl bg-slate-200/70 backdrop-blur-sm select-none ${className}`}
    >
      {/* Sliding background pill indicator */}
      {count > 0 && (
        <div
          className="absolute top-1 bottom-1 bg-white rounded-lg shadow-sm transition-all duration-200 ease-out"
          style={{
            width: `calc((100% - 8px) / ${count})`,
            left: `calc(4px + (${activeIndex} * (100% - 8px) / ${count}))`,
          }}
        />
      )}

      {/* Tabs */}
      {normalizedOptions.map((opt) => {
        const isActive = opt.key === selectedKey;
        return (
          <button
            key={opt.key}
            type="button"
            onClick={() => onChange(opt.key)}
            className={`relative z-10 flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1.5 ${
              isActive ? 'text-[#1E1E1F]' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            {opt.icon && <Icon name={opt.icon} size={14} color={isActive ? '#EE272D' : '#98A2B3'} />}
            <span>{opt.label}</span>
            {opt.badge !== null && (
              <span
                className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  isActive ? 'bg-[#EE272D] text-white' : 'bg-slate-300 text-slate-700'
                }`}
              >
                {opt.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

