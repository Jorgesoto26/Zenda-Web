// src/screens/billing/SuspendedAccountScreen.jsx
import React, { useState } from 'react';
import { toast } from 'sonner';
import Icon from '../../components/Icon';
import { useAuth } from '../../context/AuthContext';
import { confirmBillingPayment } from '../../services/billingService';
import { uploadEvidence } from '../../services/multimediaService';
import { FormatMoneyDecimales } from '../../utils/utilities';
import { zendapp } from '../../theme/zendappTheme';
import { appAlert } from '../../components/AppAlert';
import EvidencePreviewModal from '../../components/EvidencePreviewModal';
import { useTranslation } from '../../i18n';

export default function SuspendedAccountScreen() {
  const { t } = useTranslation();
  const { billingStatus, signOut, refreshBillingStatus, rol } = useAuth() || {};
  const [evidence, setEvidence] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [showEvidenceViewer, setShowEvidenceViewer] = useState(false);

  const config = billingStatus?.config || {};
  const factura = billingStatus?.factura_actual;
  const diaFacturacion = config.dia_facturacion || 28;
  const numRutas = factura
    ? Number(factura.num_vendedores || 0)
    : Number(billingStatus?.num_rutas_activas || 0);
  const total = factura
    ? Number(factura.total || 0)
    : billingStatus?.total_estimado != null
    ? Number(billingStatus.total_estimado)
    : numRutas * Number(config.precio_por_ruta || 0);
  const isConfirmado = factura?.estado === 'confirmado_cliente';
  const isAdmin = rol === 'admin' || rol === 'superadmin';

  const handleCopyAccount = (acc) => {
    if (!acc) return;
    navigator.clipboard.writeText(acc);
    toast.success(t('billing.account_copied'));
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setEvidence({
        uri: reader.result,
        base64: reader.result.split(',')[1],
        fileName: file.name,
        type: file.type,
        fileSize: file.size,
      });
    };
    reader.readAsDataURL(file);
  };

  const handleConfirmPayment = async () => {
    if (!factura?.id) {
      appAlert(t('common.error'), 'No se encontró factura pendiente asignada.');
      return;
    }
    if (!evidence) {
      appAlert(t('billing.voucher_required'), t('billing.voucher_required_msg'));
      return;
    }
    try {
      setConfirming(true);
      let comprobanteUrl = null;
      try {
        const uploadRes = await uploadEvidence({
          uri: evidence.uri,
          base64: evidence.base64,
          tipoEvidencia: 'comprobante_facturacion',
          tablaRelacionada: 'billing_invoices',
          registroId: factura.id,
          originalName: evidence.fileName || `comprobante_suspension_${factura.id}.jpg`,
          mimeType: evidence.type || 'image/jpeg',
          originalSize: evidence.fileSize || 0,
          compressedSize: evidence.fileSize || 0,
        });
        comprobanteUrl = uploadRes?.filePath || evidence.uri;
      } catch (uploadErr) {
        console.log('Error subiendo evidencia de suspensión a Storage:', uploadErr);
        comprobanteUrl = evidence.uri;
      }

      await confirmBillingPayment(factura.id, 'Evidencia adjunta', comprobanteUrl);
      appAlert(t('billing.voucher_sent'), t('billing.voucher_sent_msg'));
      setEvidence(null);
      if (refreshBillingStatus) await refreshBillingStatus();
    } catch (e) {
      appAlert(t('common.error'), e.message || 'Error');
    } finally {
      setConfirming(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-start p-4 py-8">
      <div className="w-full max-w-[440px] flex flex-col items-center">
        {/* Header Alert */}
        <div className="flex flex-col items-center text-center my-4">
          <div className="w-16 h-16 rounded-full bg-red-100 border-2 border-red-200 flex items-center justify-center text-red-600 mb-3 shadow-xs">
            <Icon name="lock" size={32} />
          </div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
            {t('billing.suspended_title')}
          </h1>
          <p className="text-xs text-slate-500 mt-1 max-w-[320px] leading-relaxed">
            {t('billing.suspended_sub')}
          </p>
        </div>

        {/* Debt Summary Card */}
        <div className="w-full bg-white rounded-2xl p-4.5 mb-3.5 border-2 border-red-300 shadow-sm">
          <p className="text-[11px] font-bold text-red-600 uppercase tracking-wider">
            {t('billing.total_to_pay')}
          </p>
          <p className="text-2xl font-black text-red-950 mt-0.5">
            {FormatMoneyDecimales(total, 'COP')}
          </p>

          <div className="mt-3 pt-3 border-t border-slate-100 space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">{t('billing.active_routes')}</span>
              <span className="font-semibold text-slate-800">
                {numRutas} {numRutas === 1 ? 'ruta' : 'rutas'}
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">{t('billing.price_per_route')}</span>
              <span className="font-semibold text-slate-800">
                {FormatMoneyDecimales(config.precio_por_ruta || 0, 'COP')}
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">{t('billing.cutoff_day')}</span>
              <span className="font-semibold text-slate-800">
                {t('billing.day_number', { day: diaFacturacion })}
              </span>
            </div>
          </div>
        </div>

        {/* Bank Information Card */}
        <div className="w-full bg-white rounded-2xl p-4.5 mb-3.5 border border-slate-200 shadow-sm">
          <h2 className="text-sm font-bold text-slate-900">{t('billing.bank_details')}</h2>
          <p className="text-xs text-slate-500 mb-3">{t('billing.bank_instructions')}</p>

          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-emerald-900">
                {config.banco || 'Bancolombia'} · {config.tipo_cuenta || 'Ahorros'}
              </p>
              <p className="text-lg font-black text-emerald-950 tracking-wider my-0.5">
                {config.numero_cuenta || '123-456789-00'}
              </p>
              <p className="text-[11px] text-emerald-800 font-medium">
                {config.titular_cuenta || 'REACTIVA S.A.S'}{' '}
                {config.nit_titular ? `· NIT ${config.nit_titular}` : ''}
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleCopyAccount(config.numero_cuenta)}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors shadow-xs shrink-0 flex items-center gap-1"
            >
              <Icon name="copy" size={12} />
              <span>{t('billing.copy')}</span>
            </button>
          </div>
        </div>

        {/* Payment Action / Pending Verification */}
        {isAdmin ? (
          isConfirmado ? (
            <div className="w-full bg-amber-50 border border-amber-300 rounded-2xl p-4 text-center mb-3.5 shadow-sm">
              <div className="w-10 h-10 rounded-full bg-amber-200 text-amber-800 flex items-center justify-center mx-auto mb-2">
                <Icon name="hourglass-half" size={18} />
              </div>
              <h3 className="text-sm font-bold text-amber-900">
                {t('billing.payment_under_review')}
              </h3>
              <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                {t('billing.payment_under_review_msg')}
              </p>
            </div>
          ) : (
            <div className="w-full bg-white rounded-2xl p-4.5 mb-3.5 border border-slate-200 shadow-sm space-y-3">
              <h3 className="text-sm font-bold text-slate-900">
                {t('billing.confirm_transfer')}
              </h3>
              <p className="text-xs text-slate-500">
                {t('billing.voucher_required_msg')}
              </p>

              <div>
                <label className="block w-full border-2 border-dashed border-slate-300 hover:border-slate-400 rounded-xl p-4 text-center cursor-pointer transition-colors bg-slate-50">
                  <Icon name="camera" size={24} className="mx-auto text-slate-400 mb-1" />
                  <span className="text-xs font-bold text-slate-700 block">
                    {evidence ? evidence.fileName : t('billing.attach_voucher')}
                  </span>
                  <span className="text-[11px] text-slate-400 block mt-0.5">
                    JPG, PNG o comprobante digital
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              </div>

              {evidence && (
                <div className="flex items-center justify-between p-2 bg-slate-100 rounded-lg text-xs">
                  <span className="truncate max-w-[200px] text-slate-700 font-medium">
                    {evidence.fileName}
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowEvidenceViewer(true)}
                    className="text-[#EE272D] font-bold text-[11px] hover:underline"
                  >
                    Ver comprobante
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={handleConfirmPayment}
                disabled={confirming || !evidence}
                className="w-full py-3 bg-[#EE272D] hover:bg-[#d91f25] disabled:opacity-50 text-white font-bold rounded-xl text-xs transition-all shadow-sm"
              >
                {confirming ? 'Enviando...' : t('billing.report_payment')}
              </button>
            </div>
          )
        ) : (
          <div className="w-full bg-slate-100 border border-slate-200 rounded-2xl p-4 text-center mb-3.5 shadow-sm">
            <h3 className="text-xs font-bold text-slate-700">
              {t('billing.vendor_restricted')}
            </h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              {t('billing.vendor_restricted_msg')}
            </p>
          </div>
        )}

        {/* Sign Out Button */}
        <button
          type="button"
          onClick={signOut}
          className="mt-2 py-2.5 px-4 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors flex items-center gap-1.5"
        >
          <Icon name="sign-out" size={14} />
          <span>{t('profile.sign_out')}</span>
        </button>
      </div>

      {showEvidenceViewer && evidence?.uri && (
        <EvidencePreviewModal
          visible={showEvidenceViewer}
          evidenceUri={evidence.uri}
          onClose={() => setShowEvidenceViewer(false)}
        />
      )}
    </div>
  );
}
