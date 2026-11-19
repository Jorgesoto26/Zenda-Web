import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import AppBackground from '../../components/AppBackground';
import Icon from '../../components/Icon';
import { FormatMoneyDecimales } from '../../utils/utilities';
import {
  getCarteraDetail,
  castigarCartera,
  getSubordinates,
  trasladarCartera,
} from '../../services/adminService';
import { appAlert } from '../../components/AppAlert';

export default function AdminCarteraDetalle() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const user = location.state?.user || {};

  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Traslado de Cartera
  const [trasladoModalVisible, setTrasladoModalVisible] = useState(false);
  const [destinatarios, setDestinatarios] = useState([]);
  const [selectedDestinoId, setSelectedDestinoId] = useState('');
  const [trasladando, setTrasladando] = useState(false);

  const loadData = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const data = await getCarteraDetail(userId);
      setItems(data || []);
    } catch (e) {
      console.error('Error cargando detalle cartera:', e);
      appAlert('Error', e.message || 'No se pudo cargar el detalle');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOpenTraslado = async () => {
    try {
      const subs = await getSubordinates(null);
      const filtered = (subs || []).filter((s) => s.id !== userId && s.activo !== false);
      setDestinatarios(filtered);
      if (filtered.length > 0) setSelectedDestinoId(filtered[0].id);
      setTrasladoModalVisible(true);
    } catch (e) {
      appAlert('Error', 'No se pudieron cargar los vendedores de destino');
    }
  };

  const handleConfirmTraslado = async () => {
    if (!selectedDestinoId) {
      return appAlert('Selección requerida', 'Debes seleccionar un vendedor de destino');
    }

    setTrasladando(true);
    try {
      await trasladarCartera(userId, selectedDestinoId);
      setTrasladoModalVisible(false);
      appAlert('Traslado Exitoso', 'La cartera ha sido transferida correctamente.', [
        { text: 'Aceptar', onPress: () => navigate('/admin/cartera') },
      ]);
    } catch (err) {
      appAlert('Error al trasladar', err.message);
    } finally {
      setTrasladando(false);
    }
  };

  const handleCastigar = async (invoiceId) => {
    appAlert(
      'Castigar Cartera',
      '¿Estás seguro de que deseas castigar (bloquear) este crédito en mora?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sí, Castigar',
          style: 'destructive',
          onPress: async () => {
            try {
              await castigarCartera(invoiceId);
              appAlert('Éxito', 'Crédito castigado');
              loadData();
            } catch (e) {
              appAlert('Error', e.message);
            }
          },
        },
      ]
    );
  };

  const filteredItems = items.filter((item) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (item.cliente_nombre && item.cliente_nombre.toLowerCase().includes(q)) ||
      (item.cliente_documento && item.cliente_documento.includes(q)) ||
      (item.cliente_direccion && item.cliente_direccion.toLowerCase().includes(q))
    );
  });

  return (
    <AppBackground>
      <div className="flex flex-col min-h-screen pb-24">
        {/* Header Superior */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200/80 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={() => navigate('/admin/cartera')}
              className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 hover:bg-slate-200"
            >
              <Icon name="arrow-left" size={15} />
            </button>
            <div>
              <h1 className="font-extrabold text-base text-[#1E1E1F] tracking-wide">
                Cartera de {user.nombre || 'Vendedor'}
              </h1>
              <p className="text-[11px] font-semibold text-slate-500">
                {items.length} créditos asignados
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleOpenTraslado}
            disabled={items.length === 0}
            className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-black text-white font-bold text-xs shadow-md disabled:opacity-40 flex items-center space-x-1"
          >
            <Icon name="random" size={12} />
            <span>Trasladar</span>
          </button>
        </header>

        {/* Buscador */}
        <div className="px-4 mt-3">
          <div className="flex items-center bg-white/90 backdrop-blur-sm border border-slate-200/90 rounded-2xl px-3.5 py-2.5 shadow-sm focus-within:border-[#EE272D]">
            <Icon name="search" size={15} className="text-slate-400 mr-2.5" />
            <input
              type="text"
              placeholder="Buscar cliente en esta cartera..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-transparent text-sm text-[#1E1E1F] font-medium outline-none placeholder:text-slate-400"
            />
          </div>
        </div>

        {/* Listado de Créditos */}
        <div className="px-4 mt-3.5 space-y-3 max-w-lg mx-auto w-full">
          {loading ? (
            <div className="text-center py-12">
              <div className="w-7 h-7 border-2 border-[#EE272D] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-xs text-slate-400 font-medium">Cargando créditos...</p>
            </div>
          ) : filteredItems.length > 0 ? (
            filteredItems.map((c) => {
              const isMoroso = Number(c.saldo_vencido) > 0;
              return (
                <div
                  key={c.invoice_id || c.id}
                  className="bg-white/95 backdrop-blur-sm rounded-3xl p-5 shadow-sm border border-slate-200/80 space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-[#1E1E1F] text-base leading-tight">
                        {c.cliente_nombre || 'Cliente'}
                      </h3>
                      <p className="text-xs text-slate-500 mt-1">
                        Cédula: <strong className="text-slate-700">{c.cliente_documento || '—'}</strong>
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Dirección: <strong className="text-slate-700">{c.cliente_direccion || '—'}</strong>
                      </p>
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                        isMoroso
                          ? 'bg-red-50 text-red-600 border-red-200'
                          : 'bg-emerald-50 text-emerald-600 border-emerald-200'
                      }`}
                    >
                      {isMoroso ? 'EN MORA' : 'AL DÍA'}
                    </span>
                  </div>

                  {/* Grilla Financiera */}
                  <div className="grid grid-cols-3 gap-2 bg-slate-50/70 rounded-2xl p-2.5 border border-slate-100 text-center">
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Total</span>
                      <span className="text-xs font-extrabold text-slate-700">
                        {FormatMoneyDecimales(c.total_facturado || c.monto)}
                      </span>
                    </div>
                    <div className="border-x border-slate-200/80">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Saldo</span>
                      <span className="text-xs font-extrabold text-[#EE272D]">
                        {FormatMoneyDecimales(c.saldo)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Cuotas Pagas</span>
                      <span className="text-xs font-extrabold text-slate-800">
                        {c.cuotas_pagadas || 0} / {c.total_cuotas || '—'}
                      </span>
                    </div>
                  </div>

                  {/* Acciones */}
                  <div className="flex items-center space-x-2 pt-1 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => navigate(`/credit-detail/${c.invoice_id || c.id}`)}
                      className="flex-1 py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors flex items-center justify-center space-x-1"
                    >
                      <Icon name="eye" size={12} />
                      <span>Ver Ficha</span>
                    </button>

                    {isMoroso && (
                      <button
                        type="button"
                        onClick={() => handleCastigar(c.invoice_id || c.id)}
                        className="py-2 px-3 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 font-bold text-xs transition-colors flex items-center space-x-1"
                      >
                        <Icon name="ban" size={12} />
                        <span>Castigar</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="bg-white/80 rounded-3xl p-8 text-center border border-slate-200/80 my-4">
              <Icon name="briefcase" size={26} className="text-slate-300 mx-auto mb-2" />
              <h4 className="font-bold text-sm text-[#1E1E1F]">No hay créditos para mostrar</h4>
            </div>
          )}
        </div>

        {/* Modal Trasladar Cartera */}
        {trasladoModalVisible && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
            <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-slate-100 space-y-4">
              <div className="w-12 h-12 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center mx-auto">
                <Icon name="random" size={22} />
              </div>
              <div className="text-center">
                <h3 className="text-lg font-bold text-[#1E1E1F]">Trasladar Cartera Completa</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Transfiere los {items.length} créditos de{' '}
                  <strong className="text-slate-800">{user.nombre}</strong> a otro vendedor activo.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Vendedor de Destino
                </label>
                <select
                  value={selectedDestinoId}
                  onChange={(e) => setSelectedDestinoId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-semibold outline-none focus:border-[#EE272D]"
                >
                  {destinatarios.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.nombre} {d.apellido || ''} ({d.rol})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setTrasladoModalVisible(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={trasladando || !selectedDestinoId}
                  onClick={handleConfirmTraslado}
                  className="flex-1 py-2.5 rounded-xl bg-[#EE272D] hover:bg-[#d91f25] text-white font-bold text-xs shadow-md disabled:opacity-50 flex items-center justify-center"
                >
                  {trasladando ? (
                    <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  ) : (
                    'Confirmar Traslado'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppBackground>
  );
}

