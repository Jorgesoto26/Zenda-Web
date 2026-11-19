// src/screens/admin/components/BillingSection.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import Icon from '../../../components/Icon';
import { getBillingStatus, confirmBillingPayment } from '../../../services/billingService';
import { uploadEvidence } from '../../../services/multimediaService';
import { FormatMoneyDecimales } from '../../../utils/utilities';
import { zendapp } from '../../../theme/zendappTheme';
import { appAlert } from '../../../components/AppAlert';
import EvidencePreviewModal from '../../../components/EvidencePreviewModal';
import { useTranslation } from '../../../i18n';

const getStatusBadge = (status, estadoFactura, t) => {
  if (estadoFactura === 'confirmado_cliente' || status === 'en_revision') {
    return {
      label: t('billing.status_in_verification'),
      color: '#D97706',
      bg: 'bg-amber-50',
      border: 'border-amber-300',
      icon: 'hourglass-half',
    };
  }
  switch (status) {
    case 'al_dia':
      return {
        label: t('billing.status_up_to_date'),
        color: '#10B981',
        bg: 'bg-emerald-50',
        border: 'border-emerald-300',
        icon: 'check-circle',
      };
    case 'alerta_previa':
      return {
        label: t('billing.status_due_soon'),
        color: '#D97706',
        bg: 'bg-amber-50',
        border: 'border-amber-300',
        icon: 'exclamation-circle',
      };
    case 'gracia_lectura':
      return {
        label: t('billing.status_grace'),
        color: '#EE272D',
        bg: 'bg-red-50',
        border: 'border-red-300',
        icon: 'clock-o',
      };
    case 'mora_critica':
    case 'suspendido':
      return {
        label: t('billing.status_suspended'),
        color: '#991B1B',
        bg: 'bg-red-100',
        border: 'border-red-400',
        icon: 'ban',
      };
    default:
      return {
        label: t('billing.status_pending'),
        color: '#4B5563',
        bg: 'bg-slate-100',
        border: 'border-slate-300',
        icon: 'info-circle',
      };
  }
};

export default function BillingSection({ onRefreshGlobal }) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [billingData, setBillingData] = useState(null);
  const [evidence, setEvidence] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [showEvidenceViewer, setShowEvidenceViewer] = useState(false);

  const fetchStatus = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const data = await getBillingStatus();
      setBillingData(data);
    } catch (e) {
      console.log('Error fetching billing status:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const handleCopyAccount = (accountNumber) => {
    if (!accountNumber) return;
    navigator.clipboard.writeText(accountNumber);
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
    const factura = billingData?.factura_actual;
    if (!factura?.id) {
      appAlert(t('common.error'), 'No se encontró factura pendiente.');
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
          originalName: evidence.fileName || `comprobante_${factura.id}.jpg`,
          mimeType: evidence.type || 'image/jpeg',
          originalSize: evidence.fileSize || 0,
          compressedSize: evidence.fileSize || 0,
        });
        comprobanteUrl = uploadRes?.filePath || evidence.uri;
      } catch (uploadErr) {
        console.log('Error subiendo evidencia a Storage:', uploadErr);
        comprobanteUrl = evidence.uri;
      }

      await confirmBillingPayment(factura.id, 'Evidencia adjunta', comprobanteUrl);
      appAlert(t('billing.voucher_sent'), t('billing.voucher_sent_msg'));
      setEvidence(null);
      await fetchStatus(true);
      if (onRefreshGlobal) onRefreshGlobal();
    } catch (err) {
      appAlert(t('common.error'), err.message || 'Error enviando comprobante');
    } finally {
      setConfirming(false);
    }
  };

  if (loading && !billingData) {
    return (
      <div className="flex flex-col items-center justify-center p-12">
        <div className="w-8 h-8 border-3 border-[#EE272D] border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
          {t('billing.loading_billing')}
        </p>
      </div>
    );
  }

  const config = billingData?.config || {};
  const factura = billingData?.factura_actual;
  const status = billingData?.billing_status || 'al_dia';
  const badge = getStatusBadge(status, factura?.estado, t);
  const isConfirmado = factura?.estado === 'confirmado_cliente';
  const isPagado = factura?.estado === 'pagado';
  const diaFacturacion = config.dia_facturacion || 28;
  const precioUnitario = Number(config.precio_por_ruta || 0);
  const numRutas = factura
    ? Number(factura.num_vendedores || 0)
    : Number(billingData?.num_rutas_activas || 0);
  const totalPagar = factura
    ? Number(factura.total || 0)
    : billingData?.total_estimado != null
    ? Number(billingData.total_estimado)
    : numRutas * precioUnitario;

  return (
    <div className="p-4 space-y-4 pb-20">
      {/* 1. Card de Factura Actual */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-red-50 text-[#EE272D] flex items-center justify-center">
              <Icon name="credit-card" size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">{t('billing.monthly_billing')}</h3>
              <p className="text-[11px] text-slate-500">
                {factura
                  ? `${t('billing.period')} ${factura.periodo_mes}/${factura.periodo_anio}`
                  : t('billing.subscription_by_routes')}
              </p>
            </div>
          </div>

          <div
            className={`px-2.5 py-1 rounded-full border text-[11px] font-bold flex items-center gap-1.5 ${badge.bg} ${badge.border}`}
            style={{ color: badge.color }}
          >
            <Icon name={badge.icon} size={11} color={badge.color} />
            <span>{badge.label}</span>
          </div>
        </div>

        {/* Desglose */}
        <div className="pt-3 space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-slate-500">{t('billing.active_routes')}</span>
            <span className="font-semibold text-slate-800">
              {numRutas === 1
                ? t('billing.vendors_count_one', { count: numRutas })
                : t('billing.vendors_count_many', { count: numRutas })}
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-slate-500">{t('billing.price_per_route')}</span>
            <span className="font-semibold text-slate-800">
              {FormatMoneyDecimales(precioUnitario, 'COP')}
            </span>
          </div>

          <div className="border-t border-slate-100 pt-2 flex justify-between items-baseline">
            <span className="text-xs font-bold text-slate-700">
              {factura ? t('billing.total_to_pay') : t('billing.estimated_total_next_cycle')}
            </span>
            <span className="text-xl font-black text-slate-900">
              {FormatMoneyDecimales(totalPagar, 'COP')}
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 pt-1">
            <Icon name="calendar" size={12} color="#667085" />
            <span>
              {t('billing.cut_date')}{' '}
              <strong className="text-slate-700 font-bold">
                {t('billing.cut_day_notice', { day: diaFacturacion })}
              </strong>
            </span>
          </div>
        </div>

        {/* Nota informativa */}
        <div className="mt-3 p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl flex items-start gap-2">
          <Icon name="info-circle" size={14} color="#475467" className="mt-0.5 shrink-0" />
          <p className="text-[11px] text-slate-600 leading-snug">
            {t('billing.rule_new_vendors', { day: diaFacturacion })}
          </p>
        </div>
      </div>

      {/* 2. Card de Datos Bancarios */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Icon name="building" size={16} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">{t('billing.account_details')}</h3>
            <p className="text-[11px] text-slate-500">{t('billing.bank_account_co')}</p>
          </div>
        </div>

        <div className="space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-slate-500">{t('billing.bank')}:</span>
            <span className="font-semibold text-slate-800">{config.banco || '—'}</span>
          </div>

          <div className="flex justify-between">
            <span className="text-slate-500">{t('billing.account_type')}:</span>
            <span className="font-semibold text-slate-800">{config.tipo_cuenta || '—'}</span>
          </div>

          {/* Destacado con Copiar */}
          <div className="my-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase text-emerald-800">
                {t('billing.account_number_upper')}
              </p>
              <p className="text-base font-black text-emerald-950 tracking-wider">
                {config.numero_cuenta || '—'}
              </p>
            </div>
            {config.numero_cuenta && (
              <button
                type="button"
                onClick={() => handleCopyAccount(config.numero_cuenta)}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors shadow-xs flex items-center gap-1"
              >
                <Icon name="copy" size={12} />
                <span>{t('billing.copy')}</span>
              </button>
            )}
          </div>

          <div className="flex justify-between">
            <span className="text-slate-500">{t('billing.account_holder')}:</span>
            <span className="font-semibold text-slate-800">{config.titular_cuenta || '—'}</span>
          </div>

          <div className="flex justify-between">
            <span className="text-slate-500">{t('billing.nit')}:</span>
            <span className="font-semibold text-slate-800">{config.nit_titular || '—'}</span>
          </div>
        </div>
      </div>

      {/* 3. Acción de Confirmación de Pago */}
      {isPagado ? (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 text-center shadow-xs">
          <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-2">
            <Icon name="check-circle" size={20} />
          </div>
          <h4 className="text-sm font-bold text-emerald-900">
            {t('billing.subscription_up_to_date')}
          </h4>
          <p className="text-xs text-emerald-700 mt-1">
            {t('billing.subscription_up_to_date_desc')}
          </p>
        </div>
      ) : isConfirmado ? (
        <div className="bg-amber-50 border border-amber-300 rounded-2xl p-5 text-center shadow-xs space-y-2">
          <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center mx-auto mb-1">
            <Icon name="hourglass-half" size={18} />
          </div>
          <h4 className="text-sm font-bold text-amber-900">{t('billing.in_review_title')}</h4>
          <p className="text-xs text-amber-800">{t('billing.in_review_sub')}</p>
          {factura?.comprobante_url && (
            <button
              type="button"
              onClick={() => setShowEvidenceViewer(true)}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-amber-300 bg-amber-100/60 text-amber-900 text-xs font-bold hover:bg-amber-200/60 transition-colors"
            >
              <Icon name="image" size={13} />
              <span>{t('billing.view_sent_evidence')}</span>
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
          <h4 className="text-sm font-bold text-slate-900">{t('billing.confirm_title')}</h4>
          <p className="text-xs text-slate-500">{t('billing.confirm_sub')}</p>

          <label className="block w-full border-2 border-dashed border-slate-300 hover:border-slate-400 rounded-xl p-4 text-center cursor-pointer transition-colors bg-slate-50">
            <Icon name="camera" size={22} className="mx-auto text-slate-400 mb-1" />
            <span className="text-xs font-bold text-slate-700 block">
              {evidence ? evidence.fileName : t('billing.attach_voucher')}
            </span>
            <span className="text-[11px] text-slate-400 block mt-0.5">
              JPG, PNG o foto del comprobante
            </span>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
              disabled={confirming}
            />
          </label>

          {evidence && (
            <div className="flex items-center justify-between p-2.5 bg-slate-100 rounded-xl text-xs">
              <span className="truncate max-w-[200px] text-slate-700 font-medium">
                {evidence.fileName}
              </span>
              <button
                type="button"
                onClick={() => setEvidence(null)}
                className="text-red-600 font-bold text-[11px] hover:underline"
              >
                {t('common.cancel')}
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={handleConfirmPayment}
            disabled={confirming || !evidence}
            className="w-full py-3 bg-[#EE272D] hover:bg-[#d91f25] disabled:opacity-50 text-white font-bold rounded-xl text-xs transition-all shadow-xs flex items-center justify-center gap-1.5"
          >
            {confirming ? (
              <span>Enviando...</span>
            ) : (
              <>
                <Icon name="check" size={14} color="#FFFFFF" />
                <span>{t('billing.confirm_btn')}</span>
              </>
            )}
          </button>
        </div>
      )}

      {showEvidenceViewer && (factura?.comprobante_url || evidence?.uri) && (
        <EvidencePreviewModal
          visible={showEvidenceViewer}
          evidenceUri={factura?.comprobante_url || evidence?.uri}
          onClose={() => setShowEvidenceViewer(false)}
        />
      )}
    </div>
  );
}
