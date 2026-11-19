import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import AppBackground from '../../components/AppBackground';
import Icon from '../../components/Icon';
import AnimatedSegmentedControl from '../../components/AnimatedSegmentedControl';
import { FormatMoneyDecimales, formatMoneyInput, parseMoneyToNumeric } from '../../utils/utilities';
import {
  getCajaMovements,
  createAdminCajaMovement,
  reabrirCajaAdmin,
} from '../../services/adminService';
import { appAlert } from '../../components/AppAlert';
import EvidencePreviewModal from '../../components/EvidencePreviewModal';

export default function AdminCajaDetalle() {
  const { cajaId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const caja = location.state?.caja || {};

  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState('todos');

  // Modal nuevo movimiento
  const [modalVisible, setModalVisible] = useState(false);
  const [movTipo, setMovTipo] = useState('gasto');
  const [movDesc, setMovDesc] = useState('');
  const [movMonto, setMovMonto] = useState('');
  const [savingMov, setSavingMov] = useState(false);

  // Evidencia
  const [previewEvidence, setPreviewEvidence] = useState(null);
  const [cajaEstado, setCajaEstado] = useState(caja.estado || 'abierta');

  const loadMovements = useCallback(async () => {
    if (!cajaId) return;
    setLoading(true);
    try {
      const data = await getCajaMovements(cajaId);
      setMovements(data || []);
    } catch (e) {
      console.error('Error cargando movimientos caja:', e);
      appAlert('Error', e.message || 'No se pudieron cargar los movimientos');
    } finally {
      setLoading(false);
    }
  }, [cajaId]);

  useEffect(() => {
    loadMovements();
  }, [loadMovements]);

  const handleReabrir = async () => {
    appAlert(
      'Reabrir Caja',
      '¿Estás seguro de que deseas reabrir esta caja? Solo puedes tener 1 caja abierta a la vez por usuario.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sí, Reabrir',
          onPress: async () => {
            try {
              await reabrirCajaAdmin(cajaId);
              setCajaEstado('abierta');
              appAlert('Éxito', 'La caja fue reabierta correctamente');
              loadMovements();
            } catch (err) {
              appAlert('Error al reabrir', err.message);
            }
          },
        },
      ]
    );
  };

  const handleCreateMovement = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const val = parseMoneyToNumeric(movMonto);
    if (val <= 0) return appAlert('Error', 'El monto debe ser mayor a cero');
    if (!movDesc.trim()) return appAlert('Error', 'Ingresa una descripción');

    setSavingMov(true);
    try {
      await createAdminCajaMovement({
        cajaId,
        tipo: movTipo,
        descripcion: movDesc.trim(),
        monto: val,
      });

      setModalVisible(false);
      setMovDesc('');
      setMovMonto('');
      appAlert('Guardado', 'Movimiento registrado en la caja del vendedor');
      loadMovements();
    } catch (err) {
      appAlert('Error', err.message);
    } finally {
      setSavingMov(false);
    }
  };

  const filteredMovements = movements.filter((m) => {
    if (selectedType !== 'todos' && (m.tipo || '').toLowerCase() !== selectedType) {
      return false;
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        (m.descripcion && m.descripcion.toLowerCase().includes(q)) ||
        (m.concepto && m.concepto.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <AppBackground>
      <div className="flex flex-col min-h-screen pb-24">
        {/* Header Superior */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200/80 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={() => navigate('/admin/cajas')}
              className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 hover:bg-slate-200"
            >
              <Icon name="arrow-left" size={15} />
            </button>
            <div>
              <h1 className="font-extrabold text-base text-[#1E1E1F] tracking-wide">
                Caja de {caja.nombre_usuario || 'Vendedor'}
              </h1>
              <p className="text-[11px] font-semibold text-slate-500">
                Detalle y Auditoría de Turno
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-1.5">
            {cajaEstado !== 'abierta' ? (
              <button
                type="button"
                onClick={handleReabrir}
                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-colors flex items-center space-x-1"
              >
                <Icon name="unlock" size={12} />
                <span>Reabrir</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setModalVisible(true)}
                className="px-3 py-1.5 rounded-xl bg-[#EE272D] hover:bg-[#d91f25] text-white font-bold text-xs shadow-md transition-colors flex items-center space-x-1"
              >
                <Icon name="plus" size={12} />
                <span>Ajuste</span>
              </button>
            )}
          </div>
        </header>

        {/* Tarjeta de Resumen de Caja */}
        <div className="px-4 pt-4">
          <div className="bg-gradient-to-br from-[#1E1E1F] to-[#2B2B2E] text-white rounded-3xl p-5 shadow-xl space-y-3">
            <div className="flex justify-between items-center">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Saldo Actual / Cierre
                </span>
                <span className="text-2xl font-black text-white mt-0.5 block">
                  {FormatMoneyDecimales(caja.saldo_actual || caja.saldo_final || caja.saldo_inicial)}
                </span>
              </div>
              <span
                className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border uppercase ${
                  cajaEstado === 'abierta'
                    ? 'bg-emerald-950/60 text-emerald-400 border-emerald-500/30'
                    : 'bg-white/10 text-slate-300 border-white/20'
                }`}
              >
                {cajaEstado}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 border-t border-white/10 pt-3 text-center text-xs">
              <div>
                <span className="text-slate-400 block text-[9px] font-bold uppercase">Inicial</span>
                <span className="font-extrabold text-slate-200">
                  {FormatMoneyDecimales(caja.saldo_inicial)}
                </span>
              </div>
              <div className="border-x border-white/10">
                <span className="text-slate-400 block text-[9px] font-bold uppercase">Cobros</span>
                <span className="font-extrabold text-emerald-400">
                  +{FormatMoneyDecimales(caja.total_cobros)}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[9px] font-bold uppercase">Préstamos</span>
                <span className="font-extrabold text-red-400">
                  -{FormatMoneyDecimales(caja.total_prestamos || caja.total_ventas)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Buscador */}
        <div className="px-4 mt-3">
          <div className="flex items-center bg-white/90 backdrop-blur-sm border border-slate-200/90 rounded-2xl px-3.5 py-2.5 shadow-sm focus-within:border-[#EE272D]">
            <Icon name="search" size={15} className="text-slate-400 mr-2.5" />
            <input
              type="text"
              placeholder="Buscar movimiento..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-transparent text-sm text-[#1E1E1F] font-medium outline-none placeholder:text-slate-400"
            />
          </div>
        </div>

        {/* Filtro por Tipo */}
        <div className="px-4 mt-3 overflow-x-auto no-scrollbar">
          <AnimatedSegmentedControl
            options={[
              { key: 'todos', label: 'Todos' },
              { key: 'cobro', label: 'Cobros' },
              { key: 'ingreso', label: 'Ingresos' },
              { key: 'gasto', label: 'Gastos' },
              { key: 'retiro', label: 'Retiros' },
            ]}
            selectedKey={selectedType}
            onChange={setSelectedType}
          />
        </div>

        {/* Listado de Movimientos */}
        <div className="px-4 mt-3.5 space-y-2.5 max-w-lg mx-auto w-full">
          {loading ? (
            <div className="text-center py-12">
              <div className="w-7 h-7 border-2 border-[#EE272D] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-xs text-slate-400 font-medium">Cargando movimientos...</p>
            </div>
          ) : filteredMovements.length > 0 ? (
            filteredMovements.map((m) => {
              const isPos = m.tipo === 'cobro' || m.tipo === 'ingreso';
              return (
                <div
                  key={m.id}
                  className="bg-white/95 backdrop-blur-sm rounded-2xl p-4 shadow-sm border border-slate-200/80 flex items-start justify-between"
                >
                  <div className="flex-1 pr-3">
                    <div className="flex items-center space-x-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase bg-slate-50 text-slate-700">
                        {m.tipo}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {m.fecha || m.created_at
                          ? new Date(m.fecha || m.created_at).toLocaleTimeString('es-CO', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : '—'}
                      </span>
                    </div>
                    <p className="text-xs font-bold text-[#1E1E1F] mt-1.5">
                      {m.descripcion || m.concepto}
                    </p>
                  </div>

                  <div className="flex flex-col items-end space-y-1 shrink-0">
                    <span className={`text-sm font-extrabold ${isPos ? 'text-emerald-600' : 'text-[#EE272D]'}`}>
                      {isPos ? '+' : '-'}
                      {FormatMoneyDecimales(m.monto)}
                    </span>
                    {m.evidencia_path && (
                      <button
                        type="button"
                        onClick={() => setPreviewEvidence(m.evidencia_path)}
                        className="text-[10px] text-slate-500 hover:text-[#EE272D] font-bold flex items-center space-x-1"
                      >
                        <Icon name="image" size={11} />
                        <span>Soporte</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="bg-white/80 rounded-3xl p-8 text-center border border-slate-200/80 my-4">
              <h4 className="font-bold text-sm text-[#1E1E1F]">Sin movimientos registrados</h4>
            </div>
          )}
        </div>

        {/* Modal Registrar Movimiento Admin */}
        {modalVisible && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
            <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-slate-100 space-y-4">
              <h3 className="text-base font-bold text-[#1E1E1F]">Registrar Ajuste en Caja</h3>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Tipo</label>
                <AnimatedSegmentedControl
                  options={[
                    { key: 'ingreso', label: 'Ingreso' },
                    { key: 'gasto', label: 'Gasto' },
                    { key: 'retiro', label: 'Retiro' },
                  ]}
                  selectedKey={movTipo}
                  onChange={setMovTipo}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Monto</label>
                <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                  <span className="font-bold text-slate-400 mr-1 text-xs">$</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={movMonto}
                    onChange={(e) => setMovMonto(formatMoneyInput(e.target.value))}
                    className="w-full bg-transparent text-sm font-bold outline-none"
                    placeholder="0"
                    autoFocus
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Descripción</label>
                <input
                  type="text"
                  value={movDesc}
                  onChange={(e) => setMovDesc(e.target.value)}
                  placeholder="Motivo del ajuste..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold outline-none"
                />
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalVisible(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={savingMov}
                  onClick={handleCreateMovement}
                  className="flex-1 py-2.5 rounded-xl bg-[#EE272D] hover:bg-[#d91f25] text-white font-bold text-xs shadow-md disabled:opacity-50 flex items-center justify-center"
                >
                  {savingMov ? 'Guardando...' : 'Confirmar'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Soporte */}
        {previewEvidence && (
          <EvidencePreviewModal
            visible={Boolean(previewEvidence)}
            onClose={() => setPreviewEvidence(null)}
            evidencePath={previewEvidence}
            title="Soporte Fotográfico"
          />
        )}
      </div>
    </AppBackground>
  );
}

