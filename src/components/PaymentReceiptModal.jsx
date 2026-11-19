import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import Icon from './Icon';
import { FormatMoneyDecimales } from '../utils/utilities';

export default function PaymentReceiptModal({ visible, onClose, receiptData }) {
  const [sharing, setSharing] = useState(false);

  if (!visible || !receiptData) return null;
  if (typeof document === 'undefined') return null;

  const {
    id,
    clienteNombre = 'Cliente',
    clienteDoc = '',
    fecha = new Date().toISOString(),
    valor = 0,
    saldoRestante = null,
    vendedorNombre = 'Vendedor',
    orgNombre = 'ZENDA',
    orgNit = '',
    metodo = 'Efectivo',
    isPendingSync = false,
  } = receiptData;

  const formattedDate = new Date(fecha).toLocaleString('es-CO', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const receiptMessage = `
🧾 COMPROBANTE DE PAGO
=================================
Empresa: ${orgNombre} ${orgNit ? 'NIT: ' + orgNit : ''}
Comprobante N°: ${String(id).slice(-8).toUpperCase()}
Fecha: ${formattedDate}
Cliente: ${clienteNombre} ${clienteDoc ? `(${clienteDoc})` : ''}
Monto Recibido: ${FormatMoneyDecimales(valor)}
${saldoRestante !== null ? `Saldo Pendiente: ${FormatMoneyDecimales(saldoRestante)}` : ''}
Método: ${metodo}
Atendido por: ${vendedorNombre}
=================================
¡Gracias por su pago!`.trim();

  const handleShare = async () => {
    setSharing(true);
    try {
      if (navigator.share) {
        await navigator.share({
          title: `Comprobante de Pago - ${clienteNombre}`,
          text: receiptMessage,
        });
      } else {
        // Fallback: abrir en WhatsApp
        const waUrl = `https://wa.me/?text=${encodeURIComponent(receiptMessage)}`;
        window.open(waUrl, '_blank');
      }
    } catch (e) {
      console.warn('Error sharing receipt:', e);
    } finally {
      setSharing(false);
    }
  };

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-[360px] bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 text-center animate-scaleUp">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:text-slate-800 flex items-center justify-center"
        >
          <Icon name="times" size={16} />
        </button>

        {/* Brand Header */}
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#EE272D] to-[#D81E24] flex items-center justify-center text-white font-extrabold text-xl shadow-md shadow-red-500/20 mb-2">
            Z
          </div>
          <h2 className="text-base font-extrabold text-[#1E1E1F] tracking-tight">{orgNombre}</h2>
          {orgNit && <p className="text-[11px] text-slate-400 font-mono">NIT: {orgNit}</p>}
          <span className="mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
            COMPROBANTE DE PAGO
          </span>
        </div>

        {/* Amount */}
        <div className="my-5 p-4 rounded-2xl bg-slate-50 border border-slate-100">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Monto Abonado
          </span>
          <span className="text-2xl font-black text-[#1E1E1F] block mt-0.5">
            {FormatMoneyDecimales(valor)}
          </span>
          {saldoRestante !== null && (
            <div className="mt-2 pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium">Nuevo Saldo:</span>
              <strong className="text-slate-800">{FormatMoneyDecimales(saldoRestante)}</strong>
            </div>
          )}
        </div>

        {/* Details List */}
        <div className="space-y-2 text-left text-xs border-t border-slate-100 pt-3">
          <div className="flex justify-between">
            <span className="text-slate-400 font-medium">Cliente:</span>
            <span className="font-bold text-slate-800 truncate max-w-[200px]">{clienteNombre}</span>
          </div>
          {clienteDoc && (
            <div className="flex justify-between">
              <span className="text-slate-400 font-medium">Documento:</span>
              <span className="font-mono text-slate-700">{clienteDoc}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-slate-400 font-medium">Fecha:</span>
            <span className="text-slate-700">{formattedDate}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400 font-medium">Atendido por:</span>
            <span className="text-slate-700">{vendedorNombre}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400 font-medium">Referencia:</span>
            <span className="font-mono text-slate-700">{String(id).slice(-8).toUpperCase()}</span>
          </div>
          {isPendingSync && (
            <div className="p-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-[11px] flex items-center gap-1.5 mt-2">
              <Icon name="clock" size={13} color="#D97706" />
              <span>Guardado en dispositivo (pendiente de subida a nube)</span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex gap-2">
          <button
            type="button"
            onClick={handleShare}
            disabled={sharing}
            className="flex-1 h-11 rounded-xl font-bold text-xs bg-[#EE272D] hover:bg-[#D81E24] text-white flex items-center justify-center gap-2 shadow-sm transition-all active:scale-95"
          >
            <Icon name="whatsapp" size={15} color="#FFF" />
            <span>Compartir Recibo</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 h-11 rounded-xl font-bold text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all active:scale-95"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

