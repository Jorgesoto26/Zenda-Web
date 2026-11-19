import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import AppBackground from '../../components/AppBackground';
import Icon from '../../components/Icon';
import { FormatMoneyDecimales } from '../../utils/utilities';
import { formatCurrency } from '../../utils/currency';
import { getCreditDetail } from '../../services/services';
import { useAuth } from '../../context/AuthContext';
import { appAlert } from '../../components/AppAlert';
import EvidencePreviewModal from '../../components/EvidencePreviewModal';
import PaymentReceiptModal from '../../components/PaymentReceiptModal';

function StatusBadge({ estado }) {
  const map = {
    pagada: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', label: 'PAGADA' },
    pagado: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', label: 'PAGADA' },
    abonada: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', label: 'ABONADA' },
    parcial: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', label: 'ABONADA' },
    pendiente: { bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-600', label: 'PENDIENTE' },
    vencida: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', label: 'VENCIDA' },
  };
  const s = map[(estado || '').toLowerCase()] || map.pendiente;
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${s.bg} ${s.border} ${s.text}`}>
      {s.label}
    </span>
  );
}

export default function CreditDetail() {
  const { invoiceId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [docModalVisible, setDocModalVisible] = useState(false);
  const [receiptModalVisible, setReceiptModalVisible] = useState(false);
  const [activeReceipt, setActiveReceipt] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getCreditDetail(invoiceId);
      setInvoice(data);
    } catch (e) {
      console.error('Error cargando detalle de crédito:', e);
      appAlert('Error', 'No se pudo cargar la información del crédito.');
    } finally {
      setLoading(false);
    }
  }, [invoiceId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const client = invoice?.client || {};
  const cuotas = invoice?.cuotas || [];
  const pagos = invoice?.payments || [];

  const handleOpenWhatsApp = () => {
    const tel = client.telefono;
    if (!tel) return appAlert('Sin teléfono', 'Este cliente no tiene teléfono.');
    const cleanNum = tel.replace(/\D/g, '');
    const waUrl = cleanNum.startsWith('57') ? `https://wa.me/${cleanNum}` : `https://wa.me/57${cleanNum}`;
    window.open(waUrl, '_blank');
  };

  const handleOpenMaps = () => {
    const lat = client.latitud || invoice?.latitud;
    const lng = client.longitud || invoice?.longitud;
    if (!lat || !lng) return appAlert('Sin ubicación', 'No hay coordenadas guardadas para este cliente.');
    window.open(`https://maps.google.com/?q=${lat},${lng}`, '_blank');
  };

  const { isReadOnly } = useAuth() || {};

  const handleRenew = () => {
    if (isReadOnly) {
      return appAlert(
        'Modo Solo Lectura',
        'Tu cuenta se encuentra en periodo de gracia por facturación pendiente. No es posible renovar créditos.'
      );
    }
    navigate('/create-client', {
      state: {
        renewClient: {
          id: invoice.id,
          nombre: client.nombre?.split(' ')[0] || '',
          apellido: client.nombre?.split(' ').slice(1).join(' ') || '',
          alias: client.alias,
          telefono: client.telefono,
          direccion: client.direccion,
          documento: client.documento,
        },
      },
    });
  };

  return (
    <AppBackground>
      <div className="flex flex-col min-h-screen pb-24">
        {/* Header Superior */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200/80 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 hover:bg-slate-200 transition-colors"
            >
              <Icon name="arrow-left" size={15} />
            </button>
            <div>
              <h1 className="font-extrabold text-base text-[#1E1E1F] tracking-wide">
                Detalle del Crédito
              </h1>
              <p className="text-[11px] font-semibold text-slate-500">
                Factura #{invoiceId?.slice(0, 8)}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleRenew}
            className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-black text-white font-bold text-xs transition-colors flex items-center space-x-1"
          >
            <Icon name="refresh" size={11} />
            <span>Renovar</span>
          </button>
        </header>

        {loading ? (
          <div className="p-8 text-center">
            <div className="w-8 h-8 border-2 border-[#EE272D] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-xs text-slate-400 font-medium">Cargando detalles...</p>
          </div>
        ) : invoice ? (
          <div className="p-4 space-y-4 max-w-lg mx-auto w-full animate-fadeIn">
            {/* Tarjeta 1: Información del Cliente */}
            <div className="bg-white/95 backdrop-blur-sm rounded-3xl p-5 shadow-sm border border-slate-200/80 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="font-bold text-lg text-[#1E1E1F] leading-tight">
                    {client.nombre || 'Cliente'}
                  </h2>
                  {client.alias && (
                    <span className="text-xs font-semibold text-[#EE272D]">
                      "{client.alias}"
                    </span>
                  )}
                  <p className="text-xs text-slate-500 mt-1">
                    Cédula: <strong className="text-slate-700">{client.documento || '—'}</strong>
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Dirección: <strong className="text-slate-700">{client.direccion || '—'}</strong>
                  </p>
                </div>

                {/* Acciones de contacto */}
                <div className="flex items-center space-x-2">
                  {client.telefono && (
                    <button
                      type="button"
                      onClick={handleOpenWhatsApp}
                      title="Abrir WhatsApp"
                      className="w-9 h-9 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center hover:bg-emerald-100"
                    >
                      <Icon name="whatsapp" size={16} />
                    </button>
                  )}
                  {(client.latitud || invoice.latitud) && (
                    <button
                      type="button"
                      onClick={handleOpenMaps}
                      title="Ver en Google Maps"
                      className="w-9 h-9 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-200 flex items-center justify-center hover:bg-indigo-100"
                    >
                      <Icon name="map-marker" size={16} />
                    </button>
                  )}
                </div>
              </div>

              {invoice.docEvidenceUrl && (
                <div className="pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setDocModalVisible(true)}
                    className="text-xs font-bold text-[#EE272D] hover:underline flex items-center space-x-1.5"
                  >
                    <Icon name="camera" size={13} />
                    <span>Ver foto de cédula / evidencia</span>
                  </button>
                </div>
              )}
            </div>

            {/* Tarjeta 2: Resumen Financiero del Crédito */}
            <div className="bg-gradient-to-br from-[#1E1E1F] to-[#2B2B2E] text-white rounded-3xl p-5 shadow-lg space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Saldo Pendiente
                  </span>
                  <span className="text-2xl font-black text-white mt-0.5 block">
                    {formatCurrency(invoice.saldo, invoice.currency_code || 'COP')}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Total Facturado
                  </span>
                  <span className="text-lg font-bold text-slate-200 mt-0.5 block">
                    {formatCurrency(invoice.total || invoice.monto, invoice.currency_code || 'COP')}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center border-t border-white/10 pt-3 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px] font-bold uppercase">Cuotas</span>
                  <span className="font-extrabold text-white">
                    {invoice.cuotas ? invoice.cuotas.length : invoice.cuotas_count || '—'}
                  </span>
                </div>
                <div className="border-x border-white/10">
                  <span className="text-slate-400 block text-[10px] font-bold uppercase">Valor Cuota</span>
                  <span className="font-extrabold text-emerald-400">
                    {formatCurrency(cuotas[0]?.valor || (invoice.total / (cuotas.length || 1)), invoice.currency_code || 'COP')}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] font-bold uppercase">Estado</span>
                  <span className="font-extrabold text-slate-300 uppercase">
                    {invoice.status || 'PENDIENTE'}
                  </span>
                </div>
              </div>
            </div>

            {/* Tarjeta 3: Amortización de Cuotas */}
            <div className="bg-white/95 backdrop-blur-sm rounded-3xl p-5 shadow-sm border border-slate-200/80 space-y-3">
              <h3 className="font-bold text-sm text-[#1E1E1F] border-b border-slate-100 pb-2">
                Plan de Cuotas ({cuotas.length})
              </h3>

              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {cuotas.map((c) => (
                  <div
                    key={c.id || c.numero_cuota}
                    className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-50 border border-slate-100 text-xs"
                  >
                    <div>
                      <span className="font-bold text-slate-800">Cuota #{c.numero_cuota}</span>
                      <span className="text-slate-400 block text-[10px]">
                        Vence: {c.fecha_vencimiento || '—'}
                      </span>
                    </div>

                    <div className="flex items-center space-x-2.5">
                      <span className="font-extrabold text-[#1E1E1F]">
                        {FormatMoneyDecimales(c.valor)}
                      </span>
                      <StatusBadge estado={c.status} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Tarjeta 4: Historial de Pagos Registrados */}
            <div className="bg-white/95 backdrop-blur-sm rounded-3xl p-5 shadow-sm border border-slate-200/80 space-y-3">
              <h3 className="font-bold text-sm text-[#1E1E1F] border-b border-slate-100 pb-2">
                Historial de Pagos ({pagos.length})
              </h3>

              {pagos.length > 0 ? (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {pagos.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-50 border border-slate-100 text-xs"
                    >
                      <div>
                        <span className="font-bold text-emerald-600 block">
                          +{FormatMoneyDecimales(p.amount)}
                        </span>
                        <span className="text-slate-400 text-[10px]">
                          {new Date(p.created_at).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setActiveReceipt({
                            id: p.id,
                            idFactura: invoice.id,
                            clienteNombre: client.nombre,
                            clienteDoc: client.documento,
                            fecha: p.created_at,
                            valor: p.amount,
                            saldoRestante: null,
                            vendedorNombre: 'Vendedor',
                            orgNombre: 'ZENDA',
                          });
                          setReceiptModalVisible(true);
                        }}
                        className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] flex items-center space-x-1"
                      >
                        <Icon name="file-text" size={11} />
                        <span>Recibo</span>
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 text-center py-4">
                  No hay pagos registrados aún para este crédito.
                </p>
              )}
            </div>
          </div>
        ) : null}

        {/* Modal de Cédula / Evidencia */}
        {docModalVisible && invoice?.docEvidenceUrl && (
          <EvidencePreviewModal
            visible={docModalVisible}
            onClose={() => setDocModalVisible(false)}
            evidencePath={invoice.docEvidenceUrl}
            title="Cédula del Cliente"
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

