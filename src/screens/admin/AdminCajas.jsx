import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import AppBackground from '../../components/AppBackground';
import Icon from '../../components/Icon';
import AnimatedSegmentedControl from '../../components/AnimatedSegmentedControl';
import UserHeaderBadge from '../../components/UserHeaderBadge';
import BillingAlertBanner from '../../components/BillingAlertBanner';
import { CajaCard } from './components/CajaCard';
import { HierarchyBreadcrumb } from './components/HierarchyBreadcrumb';
import { FormatMoneyDecimales } from '../../utils/utilities';
import { formatCurrency } from '../../utils/currency';
import { getAdminCajas, abrirCajasMasivo } from '../../services/adminService';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from '../../i18n';
import { appAlert } from '../../components/AppAlert';

const getTodayIso = () => new Date().toISOString().split('T')[0];
const getYesterdayIso = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
};

export default function AdminCajas() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { userId, isReadOnly, profile } = useAuth();
  const userCurrency = profile?.currency_code || 'COP';

  const [hierarchyStack, setHierarchyStack] = useState([{ id: userId, name: 'Mis Cajas' }]);
  const [cajas, setCajas] = useState([]);
  const [dateFilter, setDateFilter] = useState('hoy'); // 'hoy' | 'ayer' | 'todos'
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [openingMasivo, setOpeningMasivo] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      let fIni = null;
      let fFin = null;
      if (dateFilter === 'hoy') {
        fIni = getTodayIso();
        fFin = getTodayIso();
      } else if (dateFilter === 'ayer') {
        fIni = getYesterdayIso();
        fFin = getYesterdayIso();
      }

      const targetParentId = hierarchyStack.length > 1 ? hierarchyStack[hierarchyStack.length - 1].id : null;
      const data = await getAdminCajas(fIni, fFin, targetParentId);
      setCajas(data || []);
    } catch (e) {
      console.error('Error cargando cajas admin:', e);
      appAlert(t('common.error'), e.message || 'No se pudieron cargar las cajas');
    } finally {
      setLoading(false);
    }
  }, [dateFilter, hierarchyStack, t]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleNavigateHierarchy = (subAdmin) => {
    setHierarchyStack((prev) => [
      ...prev,
      {
        id: subAdmin.usuario_id || subAdmin.id,
        name: `${subAdmin.nombre_usuario || ''}`.trim() || 'Administrador',
      },
    ]);
  };

  const handlePopHierarchy = (targetIndex) => {
    setHierarchyStack((prev) => prev.slice(0, targetIndex + 1));
  };

  const handleAbrirMasivo = async () => {
    if (isReadOnly) {
      appAlert(
        'Modo Solo Lectura',
        'Tu cuenta se encuentra en periodo de gracia por facturación pendiente. No es posible abrir cajas.'
      );
      return;
    }

    appAlert(
      'Apertura Masiva de Cajas',
      '¿Deseas abrir las cajas de hoy para todos tus vendedores que aún no tengan caja activa? El saldo inicial tomará el saldo final anterior automáticamente.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Abrir Cajas',
          onPress: async () => {
            setOpeningMasivo(true);
            try {
              const res = await abrirCajasMasivo(hierarchyStack.length > 1 ? hierarchyStack[hierarchyStack.length - 1].id : null);
              appAlert('Éxito', `Se abrieron ${res?.cajas_abiertas || res?.count || 'las'} cajas del equipo.`);
              loadData();
            } catch (err) {
              appAlert(t('common.error'), err.message || 'No se pudo realizar la apertura masiva');
            } finally {
              setOpeningMasivo(false);
            }
          },
        },
      ]
    );
  };

  const filteredCajas = useMemo(() => {
    return cajas.filter((c) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        (c.nombre_usuario && c.nombre_usuario.toLowerCase().includes(q)) ||
        (c.rol_usuario && c.rol_usuario.toLowerCase().includes(q))
      );
    });
  }, [cajas, search]);

  return (
    <AppBackground>
      <div className="flex flex-col min-h-screen pb-24">
        {/* Header Superior con UserHeaderBadge */}
        <header className="sticky top-0 z-30 bg-white/85 backdrop-blur-md border-b border-slate-200/80 px-4 py-3 flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <h1 className="font-extrabold text-base text-[#1E1E1F] tracking-wide">
              {t('cajas.title') || 'Cajas del Equipo'}
            </h1>
            <div className="my-0.5">
              <UserHeaderBadge />
            </div>
            <p className="text-[11px] font-semibold text-slate-500">
              {cajas.length} cajas registradas
            </p>
          </div>

          <div className="flex items-center space-x-1.5 shrink-0 ml-2">
            <button
              type="button"
              disabled={openingMasivo}
              onClick={handleAbrirMasivo}
              className="px-3 py-1.5 rounded-xl bg-[#EE272D] hover:bg-[#d91f25] text-white font-bold text-xs shadow-md transition-all flex items-center space-x-1 disabled:opacity-40 cursor-pointer"
            >
              <Icon name="archive" size={12} />
              <span>Apertura Masiva</span>
            </button>
          </div>
        </header>

        {/* Banner de Facturación */}
        <BillingAlertBanner />

        {/* Migas de pan de jerarquía */}
        <HierarchyBreadcrumb stack={hierarchyStack} onPop={handlePopHierarchy} />

        {/* Selector de Fecha */}
        <div className="px-4 mt-3">
          <AnimatedSegmentedControl
            options={[
              { key: 'hoy', label: 'Hoy' },
              { key: 'ayer', label: 'Ayer' },
              { key: 'todos', label: 'Histórico' },
            ]}
            selectedKey={dateFilter}
            onChange={(key) => setDateFilter(key)}
          />
        </div>

        {/* Buscador */}
        <div className="px-4 mt-3">
          <div className="flex items-center bg-white/90 backdrop-blur-sm border border-slate-200/90 rounded-2xl px-3.5 py-2.5 shadow-sm focus-within:border-[#EE272D]">
            <Icon name="search" size={15} className="text-slate-400 mr-2.5" />
            <input
              type="text"
              placeholder="Buscar por vendedor o supervisor..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-transparent text-xs text-slate-800 font-medium outline-none placeholder:text-slate-400"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <Icon name="times" size={13} />
              </button>
            )}
          </div>
        </div>

        {/* Lista de Cajas */}
        <div className="px-4 mt-3.5 space-y-3">
          {loading ? (
            <div className="text-center py-12">
              <div className="w-8 h-8 border-3 border-[#EE272D] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-xs text-slate-500 font-bold">Cargando cajas...</p>
            </div>
          ) : filteredCajas.length > 0 ? (
            filteredCajas.map((c) => (
              <CajaCard
                key={c.id || `${c.usuario_id}_${c.fecha}`}
                caja={c}
                currencyCode={c.currency_code || userCurrency}
                onPress={() => navigate(`/admin-caja-detalle/${c.id}`)}
                onNavigateHierarchy={handleNavigateHierarchy}
              />
            ))
          ) : (
            <div className="bg-white/80 rounded-2xl p-8 text-center border border-slate-200/80 my-4">
              <Icon name="archive" size={36} className="mx-auto text-slate-300 mb-2" />
              <p className="text-sm font-bold text-slate-700">No se encontraron cajas</p>
              <p className="text-xs text-slate-400 mt-0.5">
                {search ? 'No hay coincidencias para la búsqueda' : 'No hay cajas para este período'}
              </p>
            </div>
          )}
        </div>
      </div>
    </AppBackground>
  );
}
