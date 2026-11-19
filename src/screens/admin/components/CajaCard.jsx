import React from 'react';
import Icon from '../../../components/Icon';
import { FormatMoneyDecimales } from '../../../utils/utilities';

const formatFechaApertura = (dateStr) => {
  if (!dateStr) return 'Sin fecha';
  try {
    const d = new Date(dateStr);
    return d.toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return dateStr;
  }
};

export function CajaCard({ caja, isMyCaja = false, onPress, onNavigateHierarchy }) {
  const isOpen = caja.estado === 'abierta';
  const isAdmin = caja.rol_usuario === 'admin' || caja.rol_usuario === 'superadmin';
  const hasTeam = !isMyCaja && Boolean(isAdmin || caja.tiene_subordinados);
  const progreso = parseFloat(caja.progreso_visitas) || 0;
  const retirosGastos = (parseFloat(caja.valor_retiros) || 0) + (parseFloat(caja.valor_gastos) || 0);

  return (
    <div
      onClick={() => onPress && onPress(caja)}
      className={`bg-white/95 backdrop-blur-sm rounded-3xl p-5 shadow-sm border transition-all duration-200 hover:shadow-md cursor-pointer space-y-3.5 ${
        isMyCaja ? 'border-[#EE272D]/40 ring-1 ring-[#EE272D]/20' : 'border-slate-200/80'
      }`}
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
              {caja.nombre_usuario} {isMyCaja ? '(Mi Caja)' : ''}
            </h3>
            <div className="flex items-center space-x-2 mt-0.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase">
                {caja.rol_usuario || 'VENDEDOR'}
              </span>
              <span className="text-[11px] text-slate-400">•</span>
              <span className="text-[11px] text-slate-500">
                {formatFechaApertura(caja.fecha_apertura)}
              </span>
            </div>
          </div>
        </div>

        <span
          className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
            isOpen
              ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
              : 'bg-slate-100 text-slate-600 border-slate-200'
          }`}
        >
          {isOpen ? 'ABIERTA' : 'CERRADA'}
        </span>
      </div>

      {/* Botón Ver Equipo Jerarquía */}
      {hasTeam && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (onNavigateHierarchy) onNavigateHierarchy(caja);
          }}
          className="w-full bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-2xl p-2.5 flex items-center justify-between text-left transition-colors"
        >
          <div className="flex items-center space-x-2">
            <Icon name="sitemap" size={12} className="text-indigo-600" />
            <span className="text-xs font-bold text-slate-800">Ver cajas de su equipo</span>
          </div>
          <Icon name="chevron-right" size={11} className="text-indigo-600" />
        </button>
      )}

      {/* Grilla Financiera */}
      <div className="grid grid-cols-3 gap-2 bg-slate-50/70 rounded-2xl p-3 border border-slate-100 text-center">
        <div>
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Inicial</span>
          <span className="text-xs font-extrabold text-slate-700">
            {FormatMoneyDecimales(caja.saldo_inicial)}
          </span>
        </div>
        <div className="border-x border-slate-200/80">
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Cobros</span>
          <span className="text-xs font-extrabold text-emerald-600">
            +{FormatMoneyDecimales(caja.total_cobros)}
          </span>
        </div>
        <div>
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Saldo Actual</span>
          <span className="text-xs font-extrabold text-[#1E1E1F]">
            {FormatMoneyDecimales(caja.saldo_actual || caja.saldo_final)}
          </span>
        </div>
      </div>
    </div>
  );
}

