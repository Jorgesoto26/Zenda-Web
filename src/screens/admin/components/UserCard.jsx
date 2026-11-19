import React from 'react';
import Icon from '../../../components/Icon';
import { FormatMoneyDecimales } from '../../../utils/utilities';

export function UserCard({ user, onEdit, onToggle, onNavigateHierarchy }) {
  const isAdmin = user.rol === 'admin' || user.rol === 'superadmin';
  const isActive = user.activo !== false;

  return (
    <div className="bg-white/95 backdrop-blur-sm rounded-3xl p-5 shadow-sm border border-slate-200/80 space-y-3.5">
      {/* Header del Usuario */}
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-3">
          <div
            className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-lg ${
              isAdmin
                ? 'bg-indigo-50 text-indigo-600 border border-indigo-200'
                : 'bg-red-50 text-[#EE272D] border border-red-200'
            }`}
          >
            <Icon name={isAdmin ? 'shield' : 'user'} size={18} />
          </div>

          <div>
            <div className="flex items-center space-x-2">
              <h3 className="font-bold text-[#1E1E1F] text-base leading-tight">
                {user.nombre} {user.apellido || ''}
              </h3>
            </div>
            <div className="flex items-center space-x-1.5 mt-1 flex-wrap gap-y-1">
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                  isAdmin
                    ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                    : 'bg-red-50 text-[#EE272D] border border-red-200'
                }`}
              >
                {user.rol}
              </span>

              {Boolean(isAdmin || user.tiene_subordinados) && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 flex items-center">
                  <Icon name="users" size={10} className="mr-1 text-slate-500" />
                  {user.cantidad_subordinados || 0} a cargo
                </span>
              )}

              {user.email && (
                <span className="text-[11px] text-slate-400 font-medium truncate max-w-[140px]">
                  {user.email}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Punto de estado activo/inactivo */}
        <span
          className={`w-3 h-3 rounded-full mt-1 ${
            isActive ? 'bg-emerald-500 ring-4 ring-emerald-100' : 'bg-red-500 ring-4 ring-red-100'
          }`}
          title={isActive ? 'Activo' : 'Inactivo'}
        />
      </div>

      {/* Botón Explorar Equipo Subordinado */}
      {Boolean(isAdmin || user.tiene_subordinados) && (
        <button
          type="button"
          onClick={() => onNavigateHierarchy && onNavigateHierarchy(user)}
          className="w-full bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-2xl p-2.5 flex items-center justify-between text-left transition-colors"
        >
          <div className="flex items-center space-x-2.5">
            <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center">
              <Icon name="sitemap" size={12} />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-800 block">Ver equipo a cargo</span>
              <span className="text-[10px] text-slate-500">
                {user.cantidad_subordinados > 0
                  ? `${user.cantidad_subordinados} subordinado(s) directo(s)`
                  : 'Sin subordinados asignados'}
              </span>
            </div>
          </div>
          <div className="flex items-center space-x-1 text-xs font-bold text-indigo-600">
            <span>Explorar</span>
            <Icon name="chevron-right" size={11} />
          </div>
        </button>
      )}

      {/* Grilla de Límites Asignados */}
      <div className="grid grid-cols-3 gap-2 bg-slate-50/70 rounded-2xl p-2.5 border border-slate-100 text-center">
        <div>
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Max Caja</span>
          <span className="text-xs font-extrabold text-slate-800">
            {FormatMoneyDecimales(user.dinero_max_caja)}
          </span>
        </div>
        <div className="border-x border-slate-200/80">
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Max Venta</span>
          <span className="text-xs font-extrabold text-slate-800">
            {FormatMoneyDecimales(user.dinero_max_venta)}
          </span>
        </div>
        <div>
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Max Gasto</span>
          <span className="text-xs font-extrabold text-slate-800">
            {FormatMoneyDecimales(user.dinero_max_gasto)}
          </span>
        </div>
      </div>

      {/* Botones de Acción */}
      <div className="flex items-center space-x-2 pt-1 border-t border-slate-100">
        <button
          type="button"
          onClick={() => onToggle && onToggle(user)}
          className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs transition-colors ${
            isActive
              ? 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200'
              : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
          }`}
        >
          {isActive ? 'Inhabilitar' : 'Habilitar'}
        </button>
        <button
          type="button"
          onClick={() => onEdit && onEdit(user)}
          className="flex-1 py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors flex items-center justify-center space-x-1"
        >
          <Icon name="pencil" size={12} />
          <span>Editar Permisos</span>
        </button>
      </div>
    </div>
  );
}

