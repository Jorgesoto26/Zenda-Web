import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import AppBackground from '../../components/AppBackground';
import Icon from '../../components/Icon';
import AnimatedSegmentedControl from '../../components/AnimatedSegmentedControl';
import UserHeaderBadge from '../../components/UserHeaderBadge';
import BillingAlertBanner from '../../components/BillingAlertBanner';
import {
  FormatMoneyDecimales,
} from '../../utils/utilities';
import {
  formatCurrency,
  formatMoneyInput,
  parseMoneyToNumeric,
} from '../../utils/currency';
import { createSale } from '../../services/services';
import { getCajaActual } from '../../services/cajaService';
import { uploadEvidence } from '../../services/multimediaService';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from '../../i18n';
import { appAlert } from '../../components/AppAlert';
import EvidencePreviewModal from '../../components/EvidencePreviewModal';

export default function CrearCliente() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const { profile, isReadOnly } = useAuth();
  const userCurrency = profile?.currency_code || 'COP';

  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '',
    alias: '',
    direccion: '',
    telefono: '',
    genero: 'masculino',
    documento: '',
    valor: '',
    numCuotas: '30',
    tasaInteres: '20',
  });

  const [periodicidad, setPeriodicidad] = useState('diario');
  const [pagoAdelantado, setPagoAdelantado] = useState(false);
  const [documentoFoto, setDocumentoFoto] = useState(null);
  const [previewDocModal, setPreviewDocModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [caja, setCaja] = useState(null);

  useEffect(() => {
    getCajaActual().then(setCaja).catch(() => null);

    // Si viene de renovación desde CreditDetail
    if (location.state?.renewClient) {
      const rc = location.state.renewClient;
      setFormData((prev) => ({
        ...prev,
        nombre: rc.nombre || '',
        apellido: rc.apellido || '',
        alias: rc.alias || '',
        direccion: rc.direccion || '',
        telefono: (rc.telefono || '').replace(/\D/g, '').slice(0, 12),
        documento: (rc.documento || '').trim().slice(0, 12),
        genero: rc.genero || prev.genero || 'masculino',
      }));
    }
  }, [location.state]);

  const cleanTel = useMemo(() => (formData.telefono || '').replace(/\D/g, ''), [formData.telefono]);
  const cleanDoc = useMemo(() => (formData.documento || '').trim(), [formData.documento]);

  const telError = useMemo(() => {
    if (!formData.telefono) return null;
    if (cleanTel.length < 10) return `Mínimo 10 dígitos (actual: ${cleanTel.length})`;
    if (cleanTel.length > 12) return `Máximo 12 dígitos (actual: ${cleanTel.length})`;
    return null;
  }, [formData.telefono, cleanTel]);

  const docError = useMemo(() => {
    if (!formData.documento) return null;
    if (cleanDoc.length < 6) return `Mínimo 6 caracteres (actual: ${cleanDoc.length})`;
    if (cleanDoc.length > 12) return `Máximo 12 caracteres (actual: ${cleanDoc.length})`;
    return null;
  }, [formData.documento, cleanDoc]);

  // Cálculos de cuota estimada
  const simulation = useMemo(() => {
    const valorNum = parseMoneyToNumeric(formData.valor, userCurrency);
    if (!valorNum || valorNum <= 0) return null;

    const tasa = parseFloat(formData.tasaInteres) || 0;
    const cuotas = parseInt(formData.numCuotas, 10) || 1;
    const totalInteres = valorNum * (tasa / 100);
    const totalPagar = valorNum + totalInteres;
    const valorCuota = Math.round(totalPagar / Math.max(1, cuotas));

    // Fecha estimada fin
    const fechaFin = new Date();
    if (periodicidad === 'semanal') {
      fechaFin.setDate(fechaFin.getDate() + cuotas * 7);
    } else if (periodicidad === 'quincenal') {
      fechaFin.setDate(fechaFin.getDate() + cuotas * 15);
    } else if (periodicidad === 'mensual') {
      fechaFin.setMonth(fechaFin.getMonth() + cuotas);
    } else {
      fechaFin.setDate(fechaFin.getDate() + cuotas);
    }

    return {
      valorPrestamo: valorNum,
      totalInteres,
      totalPagar,
      valorCuota,
      fechaFin: fechaFin.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }),
    };
  }, [formData.valor, formData.tasaInteres, formData.numCuotas, periodicidad, userCurrency]);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setSaving(true);
      const uploadedPath = await uploadEvidence(file, 'documento_identidad');
      setDocumentoFoto(uploadedPath);
      appAlert('Evidencia guardada', 'Foto de documento cargada correctamente');
    } catch (err) {
      appAlert(t('common.error'), 'No se pudo subir la foto del documento');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();

    if (isReadOnly) {
      return appAlert(
        'Modo Solo Lectura',
        'Tu cuenta se encuentra en periodo de gracia por facturación pendiente. No es posible crear nuevos créditos.'
      );
    }

    if (!caja) {
      return appAlert('Caja cerrada', 'Debes tener una caja abierta para realizar desembolsos de créditos.');
    }

    if (!cleanDoc || docError) {
      return appAlert('Documento inválido', docError || 'Ingresa el documento del cliente');
    }

    if (!formData.nombre.trim()) {
      return appAlert('Nombre requerido', 'Ingresa el nombre del cliente');
    }

    if (!formData.direccion.trim()) {
      return appAlert('Dirección requerida', 'Ingresa la dirección del cliente');
    }

    if (!cleanTel || telError) {
      return appAlert('Teléfono inválido', telError || 'Ingresa un teléfono válido');
    }

    const valorNum = parseMoneyToNumeric(formData.valor, userCurrency);
    if (!valorNum || valorNum <= 0) {
      return appAlert('Monto requerido', 'Ingresa el monto del crédito');
    }

    const maxVenta = Number(profile?.dinero_max_venta || 0);
    const isAdmin = profile?.rol === 'admin' || profile?.rol === 'superadmin';
    if (!isAdmin && maxVenta > 0 && valorNum > maxVenta) {
      return appAlert(
        'Límite de venta excedido',
        `El monto (${formatCurrency(valorNum, userCurrency)}) supera tu límite autorizado (${formatCurrency(maxVenta, userCurrency)}).`
      );
    }

    setSaving(true);
    try {
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

      await createSale({
        cliente: {
          nombre: `${formData.nombre.trim()} ${formData.apellido.trim()}`.trim(),
          documento: cleanDoc,
          telefono: cleanTel,
          direccion: formData.direccion.trim(),
          alias: formData.alias?.trim() || null,
          latitud: lat,
          longitud: lng,
        },
        monto: valorNum,
        tasaInteres: parseFloat(formData.tasaInteres) || 20,
        plazoDias: parseInt(formData.numCuotas, 10) || 30,
        modalidadCobro: periodicidad,
        caja_id: caja.id,
        documentoFotoUrl: documentoFoto,
        pago_adelantado: pagoAdelantado,
        currency_code: userCurrency,
      });

      appAlert('¡Venta Exitosa!', 'El crédito ha sido creado y desembolsado exitosamente en tu ruta.', [
        {
          text: 'Ir a Pagos',
          onPress: () => navigate('/payments'),
        },
      ]);
    } catch (err) {
      appAlert('Error al crear venta', err.message || 'Ocurrió un error');
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
            <button
              type="button"
              onClick={() => navigate('/payments')}
              className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
            >
              <Icon name="chevron-left" size={15} />
            </button>
            <div>
              <h1 className="font-extrabold text-base text-[#1E1E1F] tracking-wide">
                {t('menu.create_sale')}
              </h1>
              <div className="mt-0.5">
                <UserHeaderBadge />
              </div>
            </div>
          </div>
          <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
            Registro Crédito
          </span>
        </header>

        {/* Banner de Facturación */}
        <BillingAlertBanner />

        <form onSubmit={handleSubmit} className="p-4 space-y-4 max-w-lg mx-auto w-full">
          {/* Tarjeta 1: Datos del Cliente */}
          <div className="bg-white/95 backdrop-blur-sm rounded-3xl p-5 shadow-sm border border-slate-200/80 space-y-3.5">
            <div className="flex items-center space-x-2 text-slate-800 font-bold text-sm border-b border-slate-100 pb-2.5">
              <Icon name="user" size={15} className="text-[#EE272D]" />
              <span>Información Personal</span>
            </div>

            {/* Documento */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Documento de Identidad (C.C.)
              </label>
              <input
                type="text"
                placeholder="Ej. 10203040"
                value={formData.documento}
                onChange={(e) => setFormData({ ...formData, documento: e.target.value })}
                className={`w-full bg-slate-50 border rounded-2xl px-3.5 py-2.5 text-sm font-semibold text-[#1E1E1F] outline-none transition-all ${
                  docError ? 'border-red-400 focus:ring-2 focus:ring-red-200' : 'border-slate-200 focus:border-[#EE272D]'
                }`}
                required
              />
              {docError && <p className="text-[11px] text-red-500 font-medium mt-1">{docError}</p>}
            </div>

            {/* Nombres y Apellidos */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Primer Nombre
                </label>
                <input
                  type="text"
                  placeholder="Juan"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-2.5 text-sm font-semibold text-[#1E1E1F] outline-none focus:border-[#EE272D]"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Apellidos
                </label>
                <input
                  type="text"
                  placeholder="Pérez"
                  value={formData.apellido}
                  onChange={(e) => setFormData({ ...formData, apellido: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-2.5 text-sm font-semibold text-[#1E1E1F] outline-none focus:border-[#EE272D]"
                />
              </div>
            </div>

            {/* Alias / Apodo */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Alias o Nombre de Negocio (Opcional)
              </label>
              <input
                type="text"
                placeholder="Ej. Tienda Doña Rosa"
                value={formData.alias}
                onChange={(e) => setFormData({ ...formData, alias: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-2.5 text-sm font-semibold text-[#1E1E1F] outline-none focus:border-[#EE272D]"
              />
            </div>

            {/* Dirección */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Dirección Completa
              </label>
              <input
                type="text"
                placeholder="Calle 10 # 20 - 30, Barrio..."
                value={formData.direccion}
                onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-2.5 text-sm font-semibold text-[#1E1E1F] outline-none focus:border-[#EE272D]"
                required
              />
            </div>

            {/* Teléfono Celular */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Teléfono Celular (WhatsApp)
              </label>
              <input
                type="tel"
                placeholder="3001234567"
                value={formData.telefono}
                onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                className={`w-full bg-slate-50 border rounded-2xl px-3.5 py-2.5 text-sm font-semibold text-[#1E1E1F] outline-none transition-all ${
                  telError ? 'border-red-400 focus:ring-2 focus:ring-red-200' : 'border-slate-200 focus:border-[#EE272D]'
                }`}
                required
              />
              {telError && <p className="text-[11px] text-red-500 font-medium mt-1">{telError}</p>}
            </div>
          </div>

          {/* Tarjeta 2: Condiciones del Crédito */}
          <div className="bg-white/95 backdrop-blur-sm rounded-3xl p-5 shadow-sm border border-slate-200/80 space-y-3.5">
            <div className="flex items-center space-x-2 text-slate-800 font-bold text-sm border-b border-slate-100 pb-2.5">
              <Icon name="money" size={15} className="text-[#EE272D]" />
              <span>Condiciones del Crédito</span>
            </div>

            {/* Monto del Crédito */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Monto del Préstamo
              </label>
              <input
                type="text"
                placeholder="$ 0"
                value={formData.valor}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    valor: formatMoneyInput(e.target.value, userCurrency),
                  })
                }
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-3 text-lg font-black text-slate-900 outline-none focus:border-[#EE272D]"
                required
              />
            </div>

            {/* Modalidad de Cobro */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                Modalidad de Cobro
              </label>
              <AnimatedSegmentedControl
                options={[
                  { key: 'diario', label: 'Diario' },
                  { key: 'semanal', label: 'Semanal' },
                  { key: 'quincenal', label: 'Quincenal' },
                ]}
                selectedKey={periodicidad}
                onChange={setPeriodicidad}
              />
            </div>

            {/* Cuotas e Interés */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Número de Cuotas
                </label>
                <input
                  type="number"
                  min="1"
                  max="120"
                  value={formData.numCuotas}
                  onChange={(e) => setFormData({ ...formData, numCuotas: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-2.5 text-sm font-semibold text-[#1E1E1F] outline-none focus:border-[#EE272D]"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Interés (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.tasaInteres}
                  onChange={(e) => setFormData({ ...formData, tasaInteres: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-2.5 text-sm font-semibold text-[#1E1E1F] outline-none focus:border-[#EE272D]"
                  required
                />
              </div>
            </div>
          </div>

          {/* Tarjeta 3: Simulación en Vivo */}
          {simulation && (
            <div className="bg-gradient-to-br from-[#1E1E1F] to-[#2B2B2E] text-white rounded-3xl p-5 shadow-lg space-y-3 animate-fadeIn">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center">
                <Icon name="bar-chart" size={13} className="mr-1.5 text-red-400" />
                Resumen de Cuotas y Total
              </h4>

              <div className="grid grid-cols-2 gap-3 border-y border-white/10 py-3">
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">Total a Pagar</span>
                  <span className="text-xl font-black text-white">
                    {formatCurrency(simulation.totalPagar, userCurrency)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">
                    Valor Cuota ({periodicidad})
                  </span>
                  <span className="text-xl font-black text-emerald-400">
                    {formatCurrency(simulation.valorCuota, userCurrency)}
                  </span>
                </div>
              </div>

              <div className="flex justify-between items-center text-xs text-slate-300">
                <span>Interés total: +{formatCurrency(simulation.totalInteres, userCurrency)}</span>
                <span>Finaliza: {simulation.fechaFin}</span>
              </div>
            </div>
          )}

          {/* Botón de Guardar Venta */}
          <button
            type="submit"
            disabled={saving}
            className={`w-full py-4 px-4 rounded-2xl text-white font-bold text-sm tracking-wide shadow-xl shadow-red-500/20 transition-all flex items-center justify-center space-x-2 cursor-pointer ${
              saving ? 'bg-slate-400 cursor-not-allowed' : 'bg-[#EE272D] hover:bg-[#d91f25]'
            }`}
          >
            {saving ? (
              <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Icon name="check" size={16} />
                <span>Desembolsar y Crear Crédito</span>
              </>
            )}
          </button>
        </form>

        {/* Modal Previsualización Documento */}
        {previewDocModal && (
          <EvidencePreviewModal
            visible={previewDocModal}
            onClose={() => setPreviewDocModal(false)}
            evidencePath={documentoFoto}
            title="Cédula / Documento de Identidad"
          />
        )}
      </div>
    </AppBackground>
  );
}
