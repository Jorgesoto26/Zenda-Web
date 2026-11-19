import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../../../components/Icon';
import { FormatMoneyDecimales } from '../../../utils/utilities';
import { formatMoneyInput, getCurrencySymbol, getCurrencyDecimals } from '../../../utils/currency';
import { getMoraStatus } from '../../../utils/moraHelper';
import { createPayment } from '../../../services/services';
import { useAuth } from '../../../context/AuthContext';
import { appAlert } from '../../../components/AppAlert';
import PaymentReceiptModal from '../../../components/PaymentReceiptModal';
import { useTranslation } from '../../../i18n';

const getStatusColor = (tipo) => {
  const t = (tipo || '').toLowerCase().trim();
  if (t === 'pago') return 'text-emerald-600 bg-emerald-50 border-emerald-200';
  if (t === 'no pago' || t === 'nopago') return 'text-red-600 bg-red-50 border-red-200';
  if (t === 'parcial') return 'text-amber-600 bg-amber-50 border-amber-200';
  return 'text-slate-500 bg-slate-50 border-slate-200';
};

export default function ItemPayments({
  id,
  name,
  address,
  amount,
  status,
  paymentType,
  saldo,
  cuotasPagas,
  saldoVencido = 0,
  cuotasAtrasadas = 0,
  currency_code = 'COP',
  valorCuota,
  onPaymentSuccess,
  telefono,
  latitud,
  longitud,
  documento,
  tipoTramitado: propTipoTramitado,
  valorPagado: propValorPagado,
  cajaId,
}) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { isReadOnly } = useAuth() || {};
  const [modalParcial, setModalParcial] = useState(false);
  const [modalNoPago, setModalNoPago] = useState(false);
  const [valorParcial, setValorParcial] = useState('');
  const [loading, setLoading] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [receiptData, setReceiptData] = useState(null);

  const isTramitado = Boolean(propTipoTramitado) || status === 'ACTUALIZADO';
  const tipoTramitado = propTipoTramitado || (isTramitado ? 'PAGO' : null);
  const moraInfo = getMoraStatus(cuotasAtrasadas, saldo);

  const handleExecutePayment = async (tipo, valor) => {
    if (isReadOnly) {
      appAlert(
        'Modo Solo Lectura',
        'Tu cuenta se encuentra en periodo de gracia por facturación pendiente. No es posible registrar pagos.'
      );
      return;
    }

    setLoading(true);
    try {
      // Intentar obtener geolocalización actual del navegador
      let lat = null;
      let lng = null;
      if (navigator.geolocation) {
        try {
          const pos = await new Promise((res, rej) => {
            navigator.geolocation.getCurrentPosition(res, rej, { timeout: 4000 });
          });
          lat = pos.coords.latitude;
          lng = pos.coords.longitude;
        } catch {}
      }

      const res = await createPayment({
        invoice_id: id,
        client_id: null,
        amount: valor,
        tipo,
        caja_id: cajaId,
        latitud: lat,
        longitud: lng,
        metodo: 'Efectivo',
      });

      if (onPaymentSuccess) {
        onPaymentSuccess();
      }

      if (tipo !== 'nopago' && valor > 0) {
        setReceiptData({
          id: res?.payment?.id || String(Date.now()),
          idFactura: id,
          clienteNombre: name,
          clienteDoc: documento,
          fecha: new Date().toISOString(),
          valor,
          saldoRestante: Math.max(0, saldo - valor),
          vendedorNombre: 'Vendedor',
          orgNombre: 'ZENDA',
        });
        setShowReceiptModal(true);
      }
    } catch (e) {
      appAlert(t('common.error'), e.message || 'No se pudo registrar el pago');
    } finally {
      setLoading(false);
      setModalParcial(false);
      setModalNoPago(false);
      setValorParcial('');
    }
  };

  const handleOpenWhatsApp = (e) => {
    e.stopPropagation();
    if (!telefono) return appAlert('Sin teléfono', 'Este cliente no tiene teléfono registrado.');
    const cleanNum = telefono.replace(/\D/g, '');
    const waUrl = cleanNum.startsWith('57') ? `https://wa.me/${cleanNum}` : `https://wa.me/57${cleanNum}`;
    window.open(waUrl, '_blank');
  };

  return (
    <>
      <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-4 shadow-sm border border-slate-200/90 transition-all duration-200 hover:shadow-md">
        {/* Encabezado: Nombre, Documento, Badge Mora y Estado */}
        <div className="flex items-start justify-between">
          <div
            className="flex-1 cursor-pointer pr-2"
            onClick={() =>
              navigate(`/credit-detail/${id}`, {
                state: { clientName: name, address, telefono, latitud, longitud, saldo },
              })
            }
          >
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 className="font-bold text-[#1E1E1F] text-base leading-tight hover:text-[#EE272D] transition-colors">
                {name}
              </h3>
              {documento && (
                <span className="text-[10px] font-medium text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                  CC {documento}
                </span>
              )}
              {/* Badge de Mora con color semántico */}
              <span
                className="px-2 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1"
                style={{
                  backgroundColor: moraInfo.bg,
                  borderColor: moraInfo.borderColor,
                  color: moraInfo.color,
                }}
              >
                <Icon name={moraInfo.icon} size={10} color={moraInfo.color} />
                <span>{moraInfo.badgeText}</span>
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1 flex items-center">
              <Icon name="map-marker" size={12} className="mr-1.5 text-slate-400 shrink-0" />
              <span className="truncate">{address || 'Sin dirección registrada'}</span>
            </p>
          </div>

          <div className="flex flex-col items-end space-y-1 shrink-0">
            {isTramitado ? (
              <span
                className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${getStatusColor(
                  tipoTramitado
                )}`}
              >
                {tipoTramitado}
              </span>
            ) : (
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                PENDIENTE
              </span>
            )}
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              {paymentType || 'DIARIO'}
            </span>
          </div>
        </div>

        {/* Separador */}
        <div className="h-px bg-slate-100 my-3" />

        {/* Grilla Financiera Adaptativa */}
        <div className="grid grid-cols-4 gap-1 py-1 text-center bg-slate-50/70 rounded-xl p-2.5 border border-slate-100 text-xs">
          <div>
            <span className="text-[9px] font-bold text-slate-400 uppercase block tracking-wider">
              Cuota
            </span>
            <span className="text-xs font-extrabold text-[#1E1E1F]">
              {FormatMoneyDecimales(valorCuota || amount, currency_code)}
            </span>
          </div>
          <div className="border-l border-slate-200/80">
            <span className="text-[9px] font-bold text-slate-400 uppercase block tracking-wider">
              Vencido
            </span>
            <span
              className={`text-xs font-extrabold ${
                saldoVencido > 0 ? 'text-red-600' : 'text-slate-400'
              }`}
            >
              {FormatMoneyDecimales(saldoVencido, currency_code)}
            </span>
          </div>
          <div className="border-l border-slate-200/80">
            <span className="text-[9px] font-bold text-slate-400 uppercase block tracking-wider">
              Saldo
            </span>
            <span
              className={`text-xs font-extrabold ${
                saldo > 0 ? 'text-[#EE272D]' : 'text-emerald-600'
              }`}
            >
              {FormatMoneyDecimales(saldo, currency_code)}
            </span>
          </div>
          <div className="border-l border-slate-200/80">
            <span className="text-[9px] font-bold text-slate-400 uppercase block tracking-wider">
              Pagas
            </span>
            <span className="text-xs font-extrabold text-slate-700">{cuotasPagas || 0}</span>
          </div>
        </div>

        {/* Barra de Acciones */}
        <div className="mt-3.5 flex items-center justify-between pt-1">
          {/* Teléfono / WhatsApp & Detalle */}
          <div className="flex items-center space-x-2">
            {telefono ? (
              <button
                type="button"
                onClick={handleOpenWhatsApp}
                title="Abrir WhatsApp"
                className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center hover:bg-emerald-100 transition-colors cursor-pointer"
              >
                <Icon name="whatsapp" size={14} />
              </button>
            ) : null}

            {isTramitado && (
              <button
                type="button"
                onClick={() => {
                  setReceiptData({
                    id: String(id),
                    idFactura: id,
                    clienteNombre: name,
                    clienteDoc: documento,
                    fecha: new Date().toISOString(),
                    valor: propValorPagado || valorCuota || amount,
                    saldoRestante: saldo,
                    vendedorNombre: 'Vendedor',
                    orgNombre: 'ZENDA',
                  });
                  setShowReceiptModal(true);
                }}
                title="Ver comprobante de pago"
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 border border-slate-200 flex items-center justify-center hover:bg-slate-200 transition-colors cursor-pointer"
              >
                <Icon name="file" size={14} />
              </button>
            )}
          </div>

          {/* Botones de Cobro si está pendiente */}
          {!isTramitado && (
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setModalNoPago(true)}
                disabled={loading}
                className="px-2.5 py-1.5 rounded-xl border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 font-bold text-xs transition-colors cursor-pointer"
              >
                No Pago
              </button>
              <button
                type="button"
                onClick={() => setModalParcial(true)}
                disabled={loading}
                className="px-2.5 py-1.5 rounded-xl border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 font-bold text-xs transition-colors cursor-pointer"
              >
                Abonar
              </button>
              <button
                type="button"
                onClick={() => handleExecutePayment('pago', valorCuota || amount)}
                disabled={loading}
                className="px-3.5 py-1.5 rounded-xl bg-[#EE272D] hover:bg-[#d91f25] text-white font-bold text-xs shadow-xs transition-all active:scale-95 cursor-pointer"
              >
                Cobrar
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modal Abonar / Pagar Saldo Total */}
      {modalParcial && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-fadeIn">
          <div
            className="w-full max-w-sm bg-white rounded-3xl p-5 shadow-2xl border border-slate-100 animate-slideUp"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-extrabold text-slate-900 text-base">Abonar o Pagar Total</h3>
              <button
                type="button"
                onClick={() => setModalParcial(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-full"
              >
                <Icon name="times" size={16} />
              </button>
            </div>
            <p className="text-xs text-slate-500 mb-3">
              {name} · Saldo actual: {FormatMoneyDecimales(saldo, currency_code)}
            </p>

            <div className="mb-3">
              <input
                type="text"
                placeholder={`${getCurrencySymbol(currency_code)} ${
                  getCurrencyDecimals(currency_code) > 0 ? '0.00' : '0'
                }`}
                value={valorParcial}
                onChange={(e) =>
                  setValorParcial(formatMoneyInput(e.target.value, currency_code))
                }
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-base font-black text-slate-900 outline-none focus:border-[#EE272D] focus:ring-2 focus:ring-[#EE272D]/20"
              />
            </div>

            {saldo > 0 && (
              <button
                type="button"
                onClick={() =>
                  setValorParcial(
                    formatMoneyInput(String(saldo), currency_code, { forceDecimals: true })
                  )
                }
                className="w-full mb-3 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1 cursor-pointer"
              >
                <Icon name="check-circle" size={13} />
                <span>Pagar saldo total ({FormatMoneyDecimales(saldo, currency_code)})</span>
              </button>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setModalParcial(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  const num = Number(String(valorParcial).replace(/[^0-9.-]/g, ''));
                  if (num <= 0) return appAlert(t('common.error'), 'Ingresa un valor válido');
                  handleExecutePayment('parcial', num);
                }}
                disabled={loading}
                className="flex-1 py-2.5 rounded-xl bg-[#EE272D] hover:bg-[#d91f25] text-white text-xs font-bold shadow-xs cursor-pointer"
              >
                {loading ? 'Guardando...' : 'Confirmar Abono'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Confirmar No Pago */}
      {modalNoPago && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-fadeIn">
          <div
            className="w-full max-w-sm bg-white rounded-3xl p-5 shadow-2xl border border-slate-100 text-center animate-slideUp"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-3">
              <Icon name="exclamation-triangle" size={24} />
            </div>
            <h3 className="font-extrabold text-slate-900 text-base mb-1">Registrar No Pago</h3>
            <p className="text-xs text-slate-500 mb-4">
              ¿Deseas marcar la visita de <strong>{name}</strong> como No Pago hoy?
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setModalNoPago(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => handleExecutePayment('nopago', 0)}
                disabled={loading}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-xs cursor-pointer"
              >
                {loading ? 'Guardando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Comprobante */}
      {showReceiptModal && receiptData && (
        <PaymentReceiptModal
          visible={showReceiptModal}
          data={receiptData}
          onClose={() => setShowReceiptModal(false)}
        />
      )}
    </>
  );
}
