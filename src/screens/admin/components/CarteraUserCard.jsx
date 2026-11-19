import React from 'react';
import Icon from '../../../components/Icon';
import { FormatMoneyDecimales } from '../../../utils/utilities';

export function CarteraUserCard({ item, onPress, onNavigateHierarchy }) {
  const isAdmin = item.rol === 'admin' || item.rol === 'superadmin';
  const hasTeam = Boolean(isAdmin || item.tiene_subordinados);

  const handleCardPress = () => {
    if (hasTeam && (!item.total_creditos || parseInt(item.total_creditos, 10) === 0)) {
      if (onNavigateHierarchy) {
        onNavigateHierarchy(item);
        return;
      }
    }
    if (onPress) {
      onPress(item);
    }
  };

  return (
    <div
      onClick={handleCardPress}
      className="bg-white/95 backdrop-blur-sm rounded-3xl p-5 shadow-sm border border-slate-200/80 transition-all duration-200 hover:shadow-md cursor-pointer space-y-3.5"
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-3">
          <div
            className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
              isAdmin ? 'bg-indigo-50 text-indigo-600' : 'bg-red-50 text-[#EE272D]'
            }`}
          >
            <Icon name={isAdmin ? 'shield' : 'user'} size={17} />
          </div>

          <div>
            <h3 className="font-bold text-[#1E1E1F] text-base leading-tight">
              {item.nombre} {item.apellido || ''}
            </h3>
            <div className="flex items-center space-x-2 mt-0.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase">
                {item.rol || 'VENDEDOR'}
              </span>
              <span className="text-[11px] text-slate-400">•</span>
              <span className="text-[11px] font-semibold text-slate-600">
                {item.total_creditos || 0} créditos
              </span>
            </div>
          </div>
        </div>

        <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
          <Icon name="chevron-right" size={12} />
        </div>
      </div>

      {/* Botón Ver Equipo Jerarquía */}
      {hasTeam && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (onNavigateHierarchy) onNavigateHierarchy(item);
          }}
          className="w-full bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-2xl p-2.5 flex items-center justify-between text-left transition-colors"
        >
          <div className="flex items-center space-x-2">
            <Icon name="sitemap" size={12} className="text-indigo-600" />
            <span className="text-xs font-bold text-slate-800">Ver cartera de su equipo</span>
          </div>
          <Icon name="chevron-right" size={11} className="text-indigo-600" />
        </button>
      )}

      {/* Grilla Financiera */}
      <div className="grid grid-cols-2 gap-2 bg-slate-50/70 rounded-2xl p-3 border border-slate-100 text-center">
        <div>
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Saldo Total</span>
          <span className="text-sm font-extrabold text-[#1E1E1F]">
            {FormatMoneyDecimales(item.saldo_total)}
          </span>
        </div>
        <div className="border-l border-slate-200/80">
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Saldo Vencido</span>
          <span className={`text-sm font-extrabold ${Number(item.saldo_vencido) > 0 ? 'text-[#EE272D]' : 'text-emerald-600'}`}>
            {FormatMoneyDecimales(item.saldo_vencido)}
          </span>
        </div>
      </div>
    </div>
  );
}

