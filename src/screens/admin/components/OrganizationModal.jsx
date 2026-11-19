import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Icon from '../../../components/Icon';
import AnimatedSegmentedControl from '../../../components/AnimatedSegmentedControl';
import { getAdminOrganizacion, updateAdminOrganizacion } from '../../../services/adminService';
import { uploadEvidence, getSignedUrl } from '../../../services/multimediaService';
import { appAlert } from '../../../components/AppAlert';

export default function OrganizationModal({ visible, onClose, onSaved }) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [nombre, setNombre] = useState('');
  const [nit, setNit] = useState('');
  const [telefono, setTelefono] = useState('');
  const [direccion, setDireccion] = useState('');
  const [logoPath, setLogoPath] = useState(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState(null);
  const [modoApertura, setModoApertura] = useState('admin_masivo');

  useEffect(() => {
    if (visible) {
      loadOrg();
    }
  }, [visible]);

  const loadOrg = async () => {
    setLoading(true);
    try {
      const data = await getAdminOrganizacion();
      if (data) {
        setNombre(data.nombre || 'ZENDA');
        setNit(data.nit || '');
        setTelefono(data.telefono || '');
        setDireccion(data.direccion || '');
        setModoApertura(data.modo_apertura_caja || 'admin_masivo');
        setLogoPath(data.logo_path || null);

        if (data.logo_path) {
          try {
            const url = await getSignedUrl(data.logo_path);
            setLogoPreviewUrl(url);
          } catch {
            setLogoPreviewUrl(data.logo_path);
          }
        } else {
          setLogoPreviewUrl(null);
        }
      }
    } catch (e) {
      console.log('Error loading org:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setSaving(true);
      const uploadedPath = await uploadEvidence(file, 'logo_organizacion');
      setLogoPath(uploadedPath);
      const url = await getSignedUrl(uploadedPath);
      setLogoPreviewUrl(url);
    } catch (err) {
      appAlert('Error', 'No se pudo subir el logotipo');
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!nombre.trim()) return appAlert('Error', 'El nombre de la organización es obligatorio');

    setSaving(true);
    try {
      await updateAdminOrganizacion({
        nombre: nombre.trim(),
        nit: nit.trim(),
        telefono: telefono.trim(),
        direccion: direccion.trim(),
        logoPath,
        modoApertura,
      });

      appAlert('Guardado', 'Los datos de la organización se actualizaron correctamente');
      if (onSaved) onSaved();
      onClose();
    } catch (err) {
      appAlert('Error al guardar', err.message || 'Error desconocido');
    } finally {
      setSaving(false);
    }
  };

  if (!visible) return null;
  if (typeof document === 'undefined') return null;

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 animate-fadeIn">
      <div
        className="bg-white rounded-t-3xl sm:rounded-3xl p-6 w-full max-w-md max-h-[90vh] flex flex-col shadow-2xl border border-slate-100 animate-slideUp"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-red-50 text-[#EE272D] flex items-center justify-center">
              <Icon name="cog" size={15} />
            </div>
            <h3 className="font-bold text-base text-[#1E1E1F]">Configuración Organización</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200"
          >
            <Icon name="times" size={16} />
          </button>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <div className="w-7 h-7 border-2 border-[#EE272D] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-xs text-slate-400 font-medium">Cargando organización...</p>
          </div>
        ) : (
          <form onSubmit={handleSave} className="overflow-y-auto space-y-3.5 pr-1 flex-1">
            {/* Logo */}
            <div className="flex flex-col items-center pb-2">
              <div className="w-20 h-20 rounded-2xl bg-slate-50 border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden mb-2 relative">
                {logoPreviewUrl ? (
                  <img src={logoPreviewUrl} alt="Logo Org" className="w-full h-full object-contain p-1" />
                ) : (
                  <Icon name="building" size={26} className="text-slate-300" />
                )}
              </div>
              <label className="cursor-pointer text-xs font-bold text-[#EE272D] hover:underline flex items-center space-x-1">
                <Icon name="camera" size={12} />
                <span>{logoPreviewUrl ? 'Cambiar Logo' : 'Cargar Logo Oficial'}</span>
                <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
              </label>
            </div>

            {/* Nombre */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Nombre Comercial *</label>
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej: Inversiones del Valle"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold outline-none focus:border-[#EE272D]"
                required
              />
            </div>

            {/* NIT y Teléfono */}
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">NIT / Rut</label>
                <input
                  type="text"
                  value={nit}
                  onChange={(e) => setNit(e.target.value)}
                  placeholder="900.123.456-7"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold outline-none focus:border-[#EE272D]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Teléfono</label>
                <input
                  type="tel"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  placeholder="3001234567"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold outline-none focus:border-[#EE272D]"
                />
              </div>
            </div>

            {/* Dirección */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Dirección Principal</label>
              <input
                type="text"
                value={direccion}
                onChange={(e) => setDireccion(e.target.value)}
                placeholder="Cra 10 # 20 - 30 Oficina 401"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold outline-none focus:border-[#EE272D]"
              />
            </div>

            {/* Modo Apertura de Caja */}
            <div className="pt-2 border-t border-slate-100">
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                Modo Apertura de Caja
              </label>
              <AnimatedSegmentedControl
                options={[
                  { key: 'admin_masivo', label: 'Admin Masivo (A)' },
                  { key: 'vendedor_dia', label: 'Vendedor Diario (B)' },
                ]}
                selectedKey={modoApertura}
                onChange={setModoApertura}
              />
              <p className="text-[11px] text-slate-400 mt-1.5 leading-snug">
                {modoApertura === 'admin_masivo'
                  ? 'Modalidad A: Solo el administrador puede abrir cajas masivamente para los vendedores.'
                  : 'Modalidad B: Cada vendedor puede abrir su propia caja al iniciar la jornada.'}
              </p>
            </div>

            <div className="flex items-center space-x-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 py-2.5 rounded-xl bg-[#EE272D] hover:bg-[#d91f25] text-white font-bold text-xs shadow-md disabled:opacity-50 flex items-center justify-center"
              >
                {saving ? (
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                ) : (
                  'Guardar Cambios'
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

