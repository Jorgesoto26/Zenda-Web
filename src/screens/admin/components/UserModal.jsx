import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Icon from '../../../components/Icon';
import AnimatedSegmentedControl from '../../../components/AnimatedSegmentedControl';
import { formatMoneyInput, parseMoneyToNumeric, cleanMoneyValue } from '../../../utils/utilities';
import { appAlert } from '../../../components/AppAlert';

export function UserModal({ visible, onClose, onSave, editingUser = null }) {
  const isEditing = !!editingUser;

  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rol, setRol] = useState('vendedor');
  const [dineroMaxCaja, setDineroMaxCaja] = useState('0');
  const [dineroMaxVenta, setDineroMaxVenta] = useState('0');
  const [dineroMaxGasto, setDineroMaxGasto] = useState('0');
  const [maxCuotas, setMaxCuotas] = useState('30');
  const [permiteBorrarVenta, setPermiteBorrarVenta] = useState(false);
  const [permiteModificarPagos, setPermiteModificarPagos] = useState(false);
  const [saldoInicialCaja, setSaldoInicialCaja] = useState('0');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (editingUser) {
      setNombre(editingUser.nombre || '');
      setApellido(editingUser.apellido || '');
      setEmail(editingUser.email || '');
      setPassword('');
      setRol(editingUser.rol || 'vendedor');
      setDineroMaxCaja(editingUser.dinero_max_caja ? formatMoneyInput(String(editingUser.dinero_max_caja)) : '');
      setDineroMaxVenta(editingUser.dinero_max_venta ? formatMoneyInput(String(editingUser.dinero_max_venta)) : '');
      setDineroMaxGasto(editingUser.dinero_max_gasto ? formatMoneyInput(String(editingUser.dinero_max_gasto)) : '');
      setMaxCuotas(editingUser.max_cuotas ? cleanMoneyValue(String(editingUser.max_cuotas)) : '30');
      setPermiteBorrarVenta(!!editingUser.permite_borrar_venta);
      setPermiteModificarPagos(!!editingUser.permite_modificar_pagos);
    } else {
      setNombre('');
      setApellido('');
      setEmail('');
      setPassword('');
      setRol('vendedor');
      setDineroMaxCaja(formatMoneyInput('500000'));
      setDineroMaxVenta(formatMoneyInput('200000'));
      setDineroMaxGasto(formatMoneyInput('50000'));
      setMaxCuotas('30');
      setPermiteBorrarVenta(false);
      setPermiteModificarPagos(false);
      setSaldoInicialCaja(formatMoneyInput('0'));
    }
  }, [editingUser, visible]);

  if (!visible) return null;

  const handleSave = async (e) => {
    if (e && e.preventDefault) e.preventDefault();

    if (!nombre.trim()) return appAlert('Dato requerido', 'El nombre es obligatorio');
    if (!isEditing && (!email.trim() || !password.trim())) {
      return appAlert('Datos requeridos', 'Correo y contraseña son obligatorios');
    }
    if (!isEditing && password.trim().length < 6) {
      return appAlert('Contraseña corta', 'La contraseña debe tener al menos 6 caracteres');
    }
    if (isEditing && password.trim().length > 0 && password.trim().length < 6) {
      return appAlert('Contraseña corta', 'La nueva contraseña debe tener al menos 6 caracteres');
    }

    setLoading(true);
    try {
      await onSave({
        nombre: nombre.trim(),
        apellido: apellido.trim(),
        email: email.trim(),
        password: password.trim(),
        rol,
        dinero_max_caja: parseMoneyToNumeric(dineroMaxCaja),
        dinero_max_venta: parseMoneyToNumeric(dineroMaxVenta),
        dinero_max_gasto: parseMoneyToNumeric(dineroMaxGasto),
        max_cuotas: parseInt(cleanMoneyValue(maxCuotas) || '30', 10),
        permite_borrar_venta: permiteBorrarVenta,
        permite_modificar_pagos: permiteModificarPagos,
        saldo_inicial_caja: parseMoneyToNumeric(saldoInicialCaja),
      });
      onClose();
    } catch (err) {
      appAlert('Error', err.message || 'No se pudo guardar el usuario');
    } finally {
      setLoading(false);
    }
  };

  if (!visible) return null;
  if (typeof document === 'undefined') return null;

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 animate-fadeIn">
      <div
        className="bg-white rounded-t-3xl sm:rounded-3xl p-6 w-full max-w-md max-h-[90vh] flex flex-col shadow-2xl border border-slate-100 animate-slideUp"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <h3 className="font-bold text-base text-[#1E1E1F]">
            {isEditing ? 'Editar Usuario' : 'Crear Nuevo Usuario'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200"
          >
            <Icon name="times" size={16} />
          </button>
        </div>

        <form onSubmit={handleSave} className="overflow-y-auto space-y-3.5 pr-1 flex-1">
          {/* Rol */}
          {!isEditing && (
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                Rol del Usuario
              </label>
              <AnimatedSegmentedControl
                options={[
                  { key: 'vendedor', label: 'Vendedor' },
                  { key: 'admin', label: 'Administrador' },
                ]}
                selectedKey={rol}
                onChange={setRol}
              />
            </div>
          )}

          {/* Nombre y Apellido */}
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Nombre *</label>
              <input
                type="text"
                placeholder="Nombre"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold outline-none focus:border-[#EE272D]"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Apellido</label>
              <input
                type="text"
                placeholder="Apellido"
                value={apellido}
                onChange={(e) => setApellido(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold outline-none focus:border-[#EE272D]"
              />
            </div>
          </div>

          {/* Email y Password */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Correo Electrónico *
            </label>
            <input
              type="email"
              placeholder="correo@ejemplo.com"
              value={email}
              disabled={isEditing}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold outline-none focus:border-[#EE272D] disabled:opacity-60"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              {isEditing ? 'Nueva Contraseña (Opcional)' : 'Contraseña *'}
            </label>
            <input
              type="password"
              placeholder={isEditing ? 'Dejar en blanco para conservar actual' : 'Mínimo 6 caracteres'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold outline-none focus:border-[#EE272D]"
            />
          </div>

          {/* Límites Financieros */}
          <div className="pt-2 border-t border-slate-100">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wide block mb-2">
              Límites Operativos
            </span>

            <div className="space-y-2.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-600">Dinero Máximo en Caja</label>
                <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                  <span className="text-slate-400 font-bold mr-1 text-xs">$</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={dineroMaxCaja}
                    onChange={(e) => setDineroMaxCaja(formatMoneyInput(e.target.value))}
                    className="w-full bg-transparent text-sm font-bold outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600">Max por Venta</label>
                  <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                    <span className="text-slate-400 font-bold mr-1 text-xs">$</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={dineroMaxVenta}
                      onChange={(e) => setDineroMaxVenta(formatMoneyInput(e.target.value))}
                      className="w-full bg-transparent text-sm font-bold outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600">Max por Gasto</label>
                  <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                    <span className="text-slate-400 font-bold mr-1 text-xs">$</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={dineroMaxGasto}
                      onChange={(e) => setDineroMaxGasto(formatMoneyInput(e.target.value))}
                      className="w-full bg-transparent text-sm font-bold outline-none"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600">Máximo de Cuotas Permitidas</label>
                <input
                  type="number"
                  min="1"
                  max="120"
                  value={maxCuotas}
                  onChange={(e) => setMaxCuotas(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold outline-none"
                />
              </div>
            </div>
          </div>

          {/* Permisos Especiales */}
          <div className="pt-2 border-t border-slate-100 space-y-2">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wide block mb-1">
              Permisos Adicionales
            </span>

            <label className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer">
              <span className="text-xs font-semibold text-slate-700">Permite anular ventas</span>
              <input
                type="checkbox"
                checked={permiteBorrarVenta}
                onChange={(e) => setPermiteBorrarVenta(e.target.checked)}
                className="rounded border-slate-300 text-[#EE272D] focus:ring-[#EE272D]"
              />
            </label>

            <label className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer">
              <span className="text-xs font-semibold text-slate-700">Permite modificar cobros</span>
              <input
                type="checkbox"
                checked={permiteModificarPagos}
                onChange={(e) => setPermiteModificarPagos(e.target.checked)}
                className="rounded border-slate-300 text-[#EE272D] focus:ring-[#EE272D]"
              />
            </label>
          </div>

          <div className="flex items-center space-x-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 rounded-xl bg-[#EE272D] hover:bg-[#d91f25] text-white font-bold text-xs shadow-md disabled:opacity-50 flex items-center justify-center"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              ) : (
                'Guardar Usuario'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

