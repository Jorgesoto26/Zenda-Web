import React, { useState, useEffect, useCallback, useMemo } from 'react';
import AppBackground from '../../components/AppBackground';
import Icon from '../../components/Icon';
import AnimatedSegmentedControl from '../../components/AnimatedSegmentedControl';
import UserHeaderBadge from '../../components/UserHeaderBadge';
import BillingAlertBanner from '../../components/BillingAlertBanner';
import { FormatMoneyDecimales } from '../../utils/utilities';
import {
  formatCurrency,
  formatMoneyInput,
  parseMoneyToNumeric,
} from '../../utils/currency';
import {
  createCashMovement,
  listMovimientos,
  getCurrentLocationOrNull,
} from '../../services/movementsService';
import { getCajaActual } from '../../services/cajaService';
import { uploadEvidence } from '../../services/multimediaService';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from '../../i18n';
import { eventBus, EVENTS } from '../../utils/eventBus';
import { appAlert } from '../../components/AppAlert';
import EvidencePreviewModal from '../../components/EvidencePreviewModal';
import PaymentReceiptModal from '../../components/PaymentReceiptModal';

const getTipoColor = (tipo) => {
  const t = (tipo || '').toLowerCase().trim();
  if (t === 'cobro' || t === 'ingreso' || t === 'pago') {
    return 'text-emerald-600 bg-emerald-50 border-emerald-200';
  }
  if (t === 'gasto' || t === 'retiro') {
    return 'text-red-600 bg-red-50 border-red-200';
  }
  if (t === 'prestamo' || t === 'venta') {
    return 'text-indigo-600 bg-indigo-50 border-indigo-200';
  }
  return 'text-slate-600 bg-slate-50 border-slate-200';
};

export default function Movements() {
  const { t } = useTranslation();
  const { profile, isReadOnly } = useAuth();
  const userCurrency = profile?.currency_code || 'COP';

  const [caja, setCaja] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterTipo, setFilterTipo] = useState('todos');

  // Modal Nuevo Movimiento
  const [modalVisible, setModalVisible] = useState(false);
  const [formTipo, setFormTipo] = useState('ingreso');
  const [formDesc, setFormDesc] = useState('');
  const [formMonto, setFormMonto] = useState('');
  const [formEvidencePath, setFormEvidencePath] = useState(null);
  const [saving, setSaving] = useState(false);

  // Modales de Visor
  const [evidenceModalPath, setEvidenceModalPath] = useState(null);
  const [receiptModalVisible, setReceiptModalVisible] = useState(false);
  const [activeReceipt, setActiveReceipt] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const actualCaja = await getCajaActual().catch(() => null);
      setCaja(actualCaja);

      const movs = await listMovimientos({
        cajaId: actualCaja?.id || null,
        limit: 50,
        offset: 0,
        search: search.trim(),
        forceRemote: true,
      });

      setItems(movs || []);
    } catch (e) {
      console.error('Error cargando movimientos:', e);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    loadData();

    const unsubMov = eventBus.on(EVENTS.MOVEMENT_CHANGED, () => loadData());
    const unsubPay = eventBus.on(EVENTS.PAYMENT_REGISTERED, () => loadData());
    return () => {
      unsubMov();
      unsubPay();
    };
  }, [loadData]);

  const filteredItems = useMemo(() => {
    if (filterTipo === 'todos') return items;
    return items.filter((m) => (m.tipo || '').toLowerCase() === filterTipo);
  }, [items, filterTipo]);

  const handleCreateMovement = async (e) => {
    if (e && e.preventDefault) e.preventDefault();

    if (isReadOnly) {
      return appAlert(
        'Modo Solo Lectura',
        'Tu cuenta se encuentra en periodo de gracia por facturación pendiente. No es posible crear movimientos de caja.'
      );
    }

    const montoNum = parseMoneyToNumeric(formMonto, userCurrency);
    if (!montoNum || montoNum <= 0) return appAlert(t('common.error'), 'Ingresa un monto válido');
    if (!formDesc.trim()) return appAlert(t('common.error'), 'Ingresa una descripción para el movimiento');
    if (!caja) return appAlert(t('common.error'), 'Debes tener una caja abierta para registrar movimientos');

    const maxGasto = parseFloat(profile?.dinero_max_gasto) || 0;
    if (formTipo === 'retiro' && maxGasto > 0 && montoNum > maxGasto) {
      return appAlert(
        'Límite de retiro excedido',
        `El monto (${formatCurrency(montoNum, userCurrency)}) excede tu límite asignado por retiro (${formatCurrency(maxGasto, userCurrency)}).`
      );
    }

    setSaving(true);
    try {
      const loc = await getCurrentLocationOrNull();
      await createCashMovement({
        cajaId: caja.id,
        tipo: formTipo,
        descripcion: formDesc.trim(),
        monto: montoNum,
        latitud: loc?.lat ?? null,
        longitud: loc?.lng ?? null,
        evidenciaPath: formEvidencePath,
      });

      setModalVisible(false);
      setFormDesc('');
      setFormMonto('');
      setFormTipo('ingreso');
      setFormEvidencePath(null);

      eventBus.emit(EVENTS.MOVEMENT_CHANGED);
      await loadData();
      appAlert('Éxito', 'Movimiento registrado correctamente');
    } catch (err) {
      appAlert(t('common.error'), err.message || 'No se pudo guardar el movimiento');
    } finally {
      setSaving(false);
    }
  };

  const handleEvidenceUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setSaving(true);
      const uploaded = await uploadEvidence(file, 'gasto_soporte');
      setFormEvidencePath(uploaded);
      appAlert('Evidencia adjuntada', 'Foto de soporte cargada correctamente');
    } catch (err) {
      appAlert(t('common.error'), 'No se pudo subir la foto de soporte');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppBackground>
      <div className="flex flex-col min-h-screen pb-24">
        {/* Header Superior con UserHeaderBadge */}
        <header className="sticky top-0 z-30 bg-white/85 backdrop-blur-md border-b border-slate-200/80 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Icon name="exchange" size={16} />
            </div>
            <div>
              <h1 className="font-extrabold text-base text-[#1E1E1F] tracking-wide">
                {t('movements.title') || 'Movimientos'}
              </h1>
              <div className="mt-0.5">
                <UserHeaderBadge />
              </div>
            </div>
          </div>
          <button
            type="button"
            disabled={!caja}
            onClick={() => {
              if (isReadOnly) {
                appAlert(
                  'Modo Solo Lectura',
                  'Tu cuenta se encuentra en periodo de gracia por facturación pendiente. No es posible registrar movimientos.'
                );
                return;
              }
              setModalVisible(true);
            }}
            className="px-3.5 py-1.5 rounded-xl bg-[#EE272D] hover:bg-[#d91f25] text-white font-bold text-xs shadow-md transition-all flex items-center space-x-1.5 disabled:opacity-40 cursor-pointer"
          >
            <Icon name="plus" size={13} />
            <span>Nuevo</span>
          </button>
        </header>

        {/* Banner de Facturación */}
        <BillingAlertBanner />

        {/* Buscador */}
        <div className="px-4 mt-3">
          <div className="flex items-center bg-white/90 backdrop-blur-sm border border-slate-200/90 rounded-2xl px-3.5 py-2.5 shadow-sm focus-within:border-[#EE272D]">
            <Icon name="search" size={15} className="text-slate-400 mr-2.5" />
            <input
              type="text"
              placeholder="Buscar por concepto o descripción..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-transparent text-sm text-[#1E1E1F] font-medium outline-none placeholder:text-slate-400"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <Icon name="times" size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Segmented Control Filtro Tipo */}
        <div className="px-4 mt-3 overflow-x-auto no-scrollbar">
          <AnimatedSegmentedControl
            options={[
              { key: 'todos', label: 'Todos' },
              { key: 'cobro', label: 'Cobros' },
              { key: 'ingreso', label: 'Ingresos' },
              { key: 'gasto', label: 'Gastos' },
              { key: 'retiro', label: 'Retiros' },
              { key: 'prestamo', label: 'Ventas' },
            ]}
            selectedKey={filterTipo}
            onChange={setFilterTipo}
          />
        </div>

        {/* Listado de Movimientos */}
        <div className="px-4 mt-3.5 space-y-2.5 max-w-lg mx-auto w-full">
          {loading ? (
            <div className="text-center py-12">
              <div className="w-7 h-7 border-2 border-[#EE272D] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-xs text-slate-400 font-medium">Cargando movimientos...</p>
            </div>
          ) : filteredItems.length > 0 ? (
            filteredItems.map((item) => {
              const isPositive =
                item.tipo === 'cobro' || item.tipo === 'ingreso' || item.tipo === 'pago';
              const monto = Number(item.monto != null ? item.monto : item.valor) || 0;

              return (
                <div
                  key={item.id}
                  className="bg-white/95 backdrop-blur-sm rounded-2xl p-4 shadow-sm border border-slate-200/80 flex items-start justify-between"
                >
                  <div className="flex-1 pr-3">
                    <div className="flex items-center space-x-2">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase ${getTipoColor(
                          item.tipo
                        )}`}
                      >
                        {item.tipo || 'MOVIMIENTO'}
                      </span>
                      <span className="text-[11px] text-slate-400 font-medium">
                        {item.fecha || item.created_at
                          ? new Date(item.fecha || item.created_at).toLocaleTimeString('es-CO', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : ''}
                      </span>
                    </div>

                    <p className="font-bold text-sm text-[#1E1E1F] mt-1.5 leading-snug">
                      {item.descripcion || item.concepto || 'Sin concepto'}
                    </p>

                    {item.evidencia_path && (
                      <button
                        type="button"
                        onClick={() => setEvidenceModalPath(item.evidencia_path)}
                        className="mt-2 inline-flex items-center space-x-1 text-[11px] font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                      >
                        <Icon name="camera" size={12} />
                        <span>Ver Soporte</span>
                      </button>
                    )}
                  </div>

                  <div className="text-right shrink-0">
                    <span
                      className={`font-black text-base ${
                        isPositive ? 'text-emerald-600' : 'text-red-600'
                      }`}
                    >
                      {isPositive ? '+' : '-'}
                      {formatCurrency(monto, userCurrency)}
                    </span>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="bg-white/80 rounded-2xl p-8 text-center border border-slate-200/80 my-4">
              <Icon name="exchange" size={36} className="mx-auto text-slate-300 mb-2" />
              <p className="text-sm font-bold text-slate-700">Sin movimientos</p>
              <p className="text-xs text-slate-400 mt-0.5">
                {search ? 'No hay coincidencias para tu búsqueda' : 'No se han registrado movimientos'}
              </p>
            </div>
          )}
        </div>

        {/* Modal Registrar Nuevo Movimiento */}
        {modalVisible && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
            <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-slate-100 animate-slideUp">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-[#1E1E1F]">Registrar Movimiento de Caja</h3>
                <button
                  type="button"
                  onClick={() => setModalVisible(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 cursor-pointer"
                >
                  <Icon name="times" size={16} />
                </button>
              </div>

              <form onSubmit={handleCreateMovement} className="space-y-4">
                {/* Tipo de Movimiento */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                    Tipo de Movimiento
                  </label>
                  <AnimatedSegmentedControl
                    options={[
                      { key: 'ingreso', label: 'Ingreso (+)' },
                      { key: 'gasto', label: 'Gasto (-)' },
                      { key: 'retiro', label: 'Retiro (-)' },
                    ]}
                    selectedKey={formTipo}
                    onChange={setFormTipo}
                  />
                </div>

                {/* Monto */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Monto en Efectivo *
                  </label>
                  <div className="flex items-center bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-2.5 focus-within:border-[#EE272D]">
                    <Icon name="money" size={17} className="text-slate-400 mr-2" />
                    <input
                      type="text"
                      placeholder="$ 0"
                      value={formMonto}
                      onChange={(e) => setFormMonto(formatMoneyInput(e.target.value, userCurrency))}
                      className="w-full bg-transparent font-extrabold text-base text-[#1E1E1F] outline-none"
                      required
                      autoFocus
                    />
                  </div>
                </div>

                {/* Descripción */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Descripción / Concepto *
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Gasolina, Almuerzo, Base extra..."
                    value={formDesc}
                    onChange={(e) => setFormDesc(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-2.5 text-sm font-semibold text-[#1E1E1F] outline-none focus:border-[#EE272D]"
                    required
                  />
                </div>

                {/* Evidencia Fotográfica (Soporte) para Gastos */}
                {formTipo === 'gasto' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Foto Soporte / Recibo
                    </label>
                    <label className="cursor-pointer flex items-center justify-center space-x-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold py-2.5 px-4 rounded-xl transition-colors">
                      <Icon name="camera" size={14} />
                      <span>{formEvidencePath ? 'Foto Adjunta' : 'Tomar / Adjuntar Foto Recibo'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={handleEvidenceUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                )}

                <div className="flex items-center space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setModalVisible(false)}
                    className="flex-1 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 py-3 rounded-2xl bg-[#EE272D] hover:bg-[#d91f25] text-white font-bold text-xs shadow-md disabled:opacity-50 flex items-center justify-center cursor-pointer"
                  >
                    {saving ? (
                      <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    ) : (
                      'Guardar Movimiento'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal Previsualización de Evidencia */}
        {evidenceModalPath && (
          <EvidencePreviewModal
            visible={Boolean(evidenceModalPath)}
            onClose={() => setEvidenceModalPath(null)}
            evidencePath={evidenceModalPath}
            title="Soporte Fotográfico"
          />
        )}

        {/* Modal Recibo de Pago */}
        {receiptModalVisible && activeReceipt && (
          <PaymentReceiptModal
            visible={receiptModalVisible}
            onClose={() => setReceiptModalVisible(false)}
            receiptData={activeReceipt}
          />
        )}
      </div>
    </AppBackground>
  );
}
