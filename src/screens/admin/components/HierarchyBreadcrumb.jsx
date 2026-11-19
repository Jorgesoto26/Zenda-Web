import React from 'react';
import Icon from '../../../components/Icon';

export function HierarchyBreadcrumb({ stack = [], onPop, rootTitle = 'Mi Equipo' }) {
  if (!stack || stack.length <= 1) return null;

  const previousLevel = stack[stack.length - 2];

  return (
    <div className="bg-white/90 backdrop-blur-sm border-b border-slate-200/80 px-4 py-2 flex items-center justify-between text-xs">
      <button
        type="button"
        onClick={() => onPop && onPop(stack.length - 2)}
        className="flex items-center space-x-1 font-bold text-[#EE272D] hover:underline"
      >
        <Icon name="chevron-left" size={12} />
        <span>Volver a {previousLevel?.name || 'Atrás'}</span>
      </button>

      <div className="flex items-center space-x-1.5 text-slate-400 overflow-x-auto max-w-[200px]">
        {stack.map((item, index) => {
          const isLast = index === stack.length - 1;
          return (
            <React.Fragment key={item.id || index}>
              <button
                type="button"
                onClick={() => !isLast && onPop && onPop(index)}
                className={`truncate max-w-[80px] font-semibold ${
                  isLast ? 'text-[#1E1E1F] font-bold' : 'hover:text-slate-600'
                }`}
              >
                {item.name}
              </button>
              {!isLast && <span>/</span>}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

