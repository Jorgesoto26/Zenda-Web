import React, { useState, useEffect, useCallback } from 'react';
import AppBackground from '../../components/AppBackground';
import Icon from '../../components/Icon';
import AnimatedSegmentedControl from '../../components/AnimatedSegmentedControl';
import UserHeaderBadge from '../../components/UserHeaderBadge';
import BillingAlertBanner from '../../components/BillingAlertBanner';
import { FormatMoneyDecimales } from '../../utils/utilities';
import { formatCurrency, formatMoneyInput, parseMoneyToNumeric } from '../../utils/currency';
import {
  getCajaActual,
  abrirCaja,
  cerrarCaja,
  getMovimientosCaja,
  getHistorialCajas,
  registrarNoPagosMasivos,
} from '../../services/cajaService';
import { getInvoicesVendedor } from '../../services/services';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from '../../i18n';
import { eventBus, EVENTS } from '../../utils/eventBus';
import { appAlert } from '../../components/AppAlert';

export default function Caja() {
  const { t } = useTranslation();
  const { profile, userId, isReadOnly } = useAuth();
  const userCurrency = profile?.currency_code || 'COP';

  const [activeTab, setActiveTab] = useState('actual'); // 'actual' | 'historial'
  const [caja, setCaja] = useState(null);
  const [movimientos, setMovimientos] = useState([]);
  const [historial, setHistorial] = useState([]);
  const [pendingClients, setPendingClients] = useState([]);
  const [selectedPendingIds, setSelectedPendingIds] = useState([]);
  const [saldoInicial, setSaldoInicial] = useState('');
  const [loading, setLoading] = useState(true);
  const [modalNoPagos, setModalNoPagos] = useState(false);
  const [processing, setProcessing] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [cajaRes, histRes, invoicesRes] = await Promise.all([
        getCajaActual().catch(() => null),
        getHistorialCajas(20, 0).catch(() => []),
        getInvoicesVendedor(userId).catch(() => []),
      ]);

      setCaja(cajaRes);
      setHistorial(histRes || []);

      if (cajaRes) {
        const movs = await getMovimientosCaja(cajaRes.id, 50, 0, true);
        setMovimientos(movs || []);
      } else {
        setMovimientos([]);
        // Si hay caja previa en historial, sugerir su saldo final como saldo inicial
        if (histRes && histRes.length > 0) {
          const lastCaja = histRes[0];
          const prev = lastCaja.saldo_final != null ? lastCaja.saldo_final : lastCaja.saldo_inicial || 0;
          setSaldoInicial(formatMoneyInput(String(prev), userCurrency));
        }
      }

      // Filtrar clientes pendientes para cierre de caja
      const pClients = (invoicesRes || []).filter(
        (i) => i.status !== 'ACTUALIZADO' && i.estadoMovil !== 'actualizado' && i.saldo > 0
      );
      setPendingClients(pClients);
      setSelectedPendingIds(pClients.map((c) => String(c.id)));
    } catch (e) {
      console.error('Error cargando caja:', e);
    } finally {
      setLoading(false);
    }
  }, [userId, userCurrency]);

  useEffect(() => {
    loadData();

    const unsubMov = eventBus.on(EVENTS.MOVEMENT_CHANGED, () => loadData());
    const unsubPay = eventBus.on(EVENTS.PAYMENT_REGISTERED, () => loadData());
    return () => {
      unsubMov();
      unsubPay();
    };
  }, [loadData]);

  const isAdmin = profile?.rol === 'admin' || profile?.rol === 'superadmin';
  const modoApertura = profile?.modo_apertura_caja || 'admin_masivo';
  const canOpenCaja = isAdmin || modoApertura === 'vendedor_dia';

  const handleAbrirCaja = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (isReadOnly) {
      return appAlert(
        'Modo Solo Lectura',
        'Tu cuenta se encuentra en periodo de gracia por facturación pendiente. No es posible abrir cajas.'
      );
    }

    if (!canOpenCaja) {
      return appAlert(
        'Acceso restringido',
        'Tu organización opera bajo Modalidad A: Solo el administrador puede abrir cajas para el equipo.'
      );
    }

    const val = parseMoneyToNumeric(saldoInicial, userCurrency);
    if (val < 0) return appAlert(t('common.error'), 'Saldo inicial no puede ser negativo');

    const maxCaja = Number(profile?.dinero_max_caja || 0);
    if (!isAdmin && maxCaja > 0 && val > maxCaja) {
      return appAlert(
        'Límite de caja excedido',
        `El saldo inicial (${formatCurrency(val, userCurrency)}) excede el límite asignado a tu perfil (${formatCurrency(maxCaja, userCurrency)}).`
      );
    }

    setProcessing(true);
    try {
      await abrirCaja(val);
      await loadData();
      appAlert('Éxito', 'Caja abierta exitosamente.');
    } catch (err) {
      appAlert(t('common.error'), err.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleCerrarCaja = async () => {
    if (isReadOnly) {
      return appAlert(
        'Modo Solo Lectura',
        'Tu cuenta se encuentra en periodo de gracia por facturación pendiente. No es posible cerrar cajas.'
      );
    }

    if (pendingClients.length > 0) {
      return appAlert(
        'Clientes pendientes en ruta',
        `Tienes ${pendingClients.length} cliente(s) sin tramitar hoy. Para cerrar caja debes registrar su visita o marcarlos como 'No pago'.`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Registrar No Pagos',
            onPress: () => setModalNoPagos(true),
          },
        ]
      );
    }

    appAlert(
      'Cerrar Caja',
      '¿Estás seguro de que deseas cerrar la caja del día? Esta acción consolidará los saldos.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sí, Cerrar Caja',
          onPress: async () => {
            setProcessing(true);
            try {
              await cerrarCaja(caja.id);
              eventBus.emit(EVENTS.MOVEMENT_CHANGED);
              await loadData();
              appAlert('Caja Cerrada', 'La caja ha sido cerrada correctamente.');
            } catch (err) {
              appAlert('Error al cerrar caja', err.message);
            } finally {
              setProcessing(false);
            }
          },
        },
      ]
    );
  };

  const handleConfirmNoPagosMasivos = async () => {
    if (selectedPendingIds.length === 0) {
      return appAlert('Selección requerida', 'Debes seleccionar al menos un cliente.');
    }

    setProcessing(true);
    try {
      const res = await registrarNoPagosMasivos(selectedPendingIds);
      eventBus.emit(EVENTS.MOVEMENT_CHANGED);
      eventBus.emit(EVENTS.PAYMENT_REGISTERED);
      setModalNoPagos(false);
      await loadData();
      appAlert(
        'Operación exitosa',
        `Se registraron ${res.count} clientes como 'No pago'. Ya puedes cerrar la caja del día.`
      );
    } catch (err) {
      appAlert(t('common.error'), err.message || 'No se pudieron registrar los no pagos');
    } finally {
      setProcessing(false);
    }
  };

  // Cálculo de totales financieros de la caja abierta
  const breakdown = {
    saldoInicial: Number(caja?.saldo_inicial || 0),
    cobros: Number(caja?.total_cobros || 0),
    ventas: Number(caja?.total_prestamos || caja?.total_ventas || 0),
    ingresos: Number(caja?.total_ingresos || 0),
    gastos: Number(caja?.total_gastos || 0),
    retiros: Number(caja?.total_retiros || 0),
    saldoActual: Number(
      caja?.saldo_final != null
        ? caja.saldo_final
        : Number(caja?.saldo_inicial || 0) +
            Number(caja?.total_cobros || 0) +
            Number(caja?.total_ingresos || 0) -
            Number(caja?.total_prestamos || caja?.total_ventas || 0) -
            Number(caja?.total_gastos || 0) -
            Number(caja?.total_retiros || 0)
    ),
  };

  return (
    <AppBackground>
      <div className="flex flex-col min-h-screen pb-24">
        {/* Header Superior con UserHeaderBadge */}
        <header className="sticky top-0 z-30 bg-white/85 backdrop-blur-md border-b border-slate-200/80 px-4 py-3 flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <h1 className="font-extrabold text-base text-[#1E1E1F] tracking-wide">
              {t('caja.title') || 'Gestión de Caja'}
            </h1>
            <div className="my-0.5">
              <UserHeaderBadge />
            </div>
            <p className="text-[11px] font-semibold text-slate-500">
              {caja ? 'Caja activa en turno' : 'Sin caja abierta'}
            </p>
          </div>
          <button
            type="button"
            onClick={loadData}
            className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200 cursor-pointer"
          >
            <Icon name="refresh" size={15} />
          </button>
        </header>

        {/* Banner de Facturación */}
        <BillingAlertBanner />

        {/* Segmented Control */}
        <div className="px-4 mt-3">
          <AnimatedSegmentedControl
            options={[
              { key: 'actual', label: 'Caja Actual' },
              { key: 'historial', label: 'Historial Cajas' },
            ]}
            selectedKey={activeTab}
            onChange={setActiveTab}
          />
        </div>

        {/* Contenido Pestaña 1: Caja Actual */}
        {activeTab === 'actual' && (
          <div className="p-4 space-y-4 max-w-lg mx-auto w-full animate-fadeIn">
            {caja ? (
              <>
                {/* Tarjeta Principal de Saldo Actual */}
                <div className="bg-gradient-to-br from-[#1E1E1F] to-[#2B2B2E] text-white rounded-3xl p-6 shadow-xl space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Saldo Total en Caja
                    </span>
                    <span className="text-[11px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2.5 py-0.5 rounded-full flex items-center">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5 animate-pulse" />
                      ABIERTA
                    </span>
                  </div>

                  <span className="text-3xl font-black text-white block">
                    {formatCurrency(breakdown.saldoActual, userCurrency)}
                  </span>

                  <div className="grid grid-cols-2 gap-3 pt-3 border-t border-white/10 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">
                        Saldo Inicial
                      </span>
                      <span className="font-bold text-slate-200">
                        {formatCurrency(breakdown.saldoInicial, userCurrency)}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">
                        Recaudos
                      </span>
                      <span className="font-bold text-emerald-400">
                        +{formatCurrency(breakdown.cobros, userCurrency)}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">
                        Nuevas Ventas
                      </span>
                      <span className="font-bold text-slate-200">
                        -{formatCurrency(breakdown.ventas, userCurrency)}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">
                        Gastos & Retiros
                      </span>
                      <span className="font-bold text-red-400">
                        -{formatCurrency(breakdown.gastos + breakdown.retiros, userCurrency)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Botón Cerrar Caja */}
                <button
                  type="button"
                  onClick={handleCerrarCaja}
                  disabled={processing}
                  className="w-full py-3.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-2xl text-sm shadow-md transition-all active:scale-98 cursor-pointer flex items-center justify-center space-x-2"
                >
                  <Icon name="lock" size={16} />
                  <span>Cerrar Caja del Día</span>
                </button>
              </>
            ) : (
              <div className="bg-white/95 rounded-3xl p-6 text-center border border-slate-200/90 shadow-sm space-y-4">
                <div className="w-16 h-16 rounded-full bg-red-50 text-[#EE272D] flex items-center justify-center mx-auto">
                  <Icon name="lock" size={28} />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">No tienes caja abierta</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    {canOpenCaja
                      ? 'Ingresa el saldo con el que inicias tu jornada para abrir la caja.'
                      : 'Tu organización requiere que el administrador abra tu caja.'}
                  </p>
                </div>

                {canOpenCaja ? (
                  <form onSubmit={handleAbrirCaja} className="space-y-3">
                    <input
                      type="text"
                      placeholder="Saldo Inicial ($0)"
                      value={saldoInicial}
                      onChange={(e) => setSaldoInicial(formatMoneyInput(e.target.value, userCurrency))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-lg font-black text-center text-slate-900 outline-none focus:border-[#EE272D]"
                    />
                    <button
                      type="submit"
                      disabled={processing}
                      className="w-full py-3.5 bg-[#EE272D] hover:bg-[#d91f25] text-white font-bold rounded-2xl text-sm shadow-md cursor-pointer"
                    >
                      {processing ? 'Abriendo...' : 'Abrir Caja'}
                    </button>
                  </form>
                ) : null}
              </div>
            )}
          </div>
        )}

        {/* Contenido Pestaña 2: Historial */}
        {activeTab === 'historial' && (
          <div className="p-4 space-y-3 max-w-lg mx-auto w-full animate-fadeIn">
            {historial.length > 0 ? (
              historial.map((h) => (
                <div
                  key={h.id}
                  className="bg-white/95 backdrop-blur-sm rounded-2xl p-4 shadow-sm border border-slate-200/80 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#1E1E1F]">
                      {new Date(h.fecha_apertura).toLocaleDateString('es-CO', { dateStyle: 'long' })}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        h.estado === 'abierta'
                          ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                          : 'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}
                    >
                      {h.estado?.toUpperCase()}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-100">
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">
                        Saldo Inicial
                      </span>
                      <span className="font-extrabold text-slate-700">
                        {formatCurrency(h.saldo_inicial, userCurrency)}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">
                        Saldo Cierre
                      </span>
                      <span className="font-extrabold text-[#1E1E1F]">
                        {formatCurrency(
                          h.saldo_final != null ? h.saldo_final : h.saldo_inicial,
                          userCurrency
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12 text-slate-400 text-xs">
                No hay registros previos en el historial de cajas.
              </div>
            )}
          </div>
        )}

        {/* Modal No Pagos Masivos */}
        {modalNoPagos && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
            <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-slate-100 max-h-[85vh] flex flex-col">
              <h3 className="text-base font-bold text-[#1E1E1F]">Registrar No Pagos Masivos</h3>
              <p className="text-xs text-slate-500 mt-1 mb-3">
                Selecciona los clientes que no realizaron pago hoy para marcarlos con $0 y permitir el
                cierre de caja.
              </p>

              <div className="overflow-y-auto space-y-2 flex-1 pr-1 my-2">
                {pendingClients.map((c) => {
                  const isChecked = selectedPendingIds.includes(String(c.id));
                  return (
                    <label
                      key={c.id}
                      className="flex items-center space-x-3 p-3 rounded-2xl bg-slate-50 border border-slate-200 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedPendingIds([...selectedPendingIds, String(c.id)]);
                          } else {
                            setSelectedPendingIds(
                              selectedPendingIds.filter((id) => id !== String(c.id))
                            );
                          }
                        }}
                        className="rounded border-slate-300 text-[#EE272D] focus:ring-[#EE272D]"
                      />
                      <div className="flex-1 truncate">
                        <span className="font-bold text-xs text-slate-800 block truncate">
                          {c.name}
                        </span>
                        <span className="text-[11px] text-slate-500">
                          Saldo: {formatCurrency(c.saldo, userCurrency)}
                        </span>
                      </div>
                    </label>
                  );
                })}
              </div>

              <div className="flex items-center space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalNoPagos(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={processing || selectedPendingIds.length === 0}
                  onClick={handleConfirmNoPagosMasivos}
                  className="flex-1 py-2.5 rounded-xl bg-[#EE272D] hover:bg-[#d91f25] text-white font-bold text-xs shadow-md disabled:opacity-50 cursor-pointer"
                >
                  Confirmar ({selectedPendingIds.length})
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppBackground>
  );
}
