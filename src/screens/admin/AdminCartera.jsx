import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import AppBackground from '../../components/AppBackground';
import Icon from '../../components/Icon';
import UserHeaderBadge from '../../components/UserHeaderBadge';
import BillingAlertBanner from '../../components/BillingAlertBanner';
import { CarteraUserCard } from './components/CarteraUserCard';
import { HierarchyBreadcrumb } from './components/HierarchyBreadcrumb';
import { FormatMoneyDecimales } from '../../utils/utilities';
import { formatCurrency } from '../../utils/currency';
import { getCarteraSummary } from '../../services/adminService';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from '../../i18n';
import { appAlert } from '../../components/AppAlert';

export default function AdminCartera() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { userId, profile } = useAuth();
  const userCurrency = profile?.currency_code || 'COP';

  const [hierarchyStack, setHierarchyStack] = useState([{ id: userId, name: 'Mi Cartera' }]);
  const [summary, setSummary] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const targetParentId = hierarchyStack.length > 1 ? hierarchyStack[hierarchyStack.length - 1].id : null;
      const data = await getCarteraSummary(targetParentId);
      setSummary(data || []);
    } catch (e) {
      console.error('Error cargando cartera:', e);
      appAlert(t('common.error'), e.message || 'No se pudo cargar el resumen de cartera');
    } finally {
      setLoading(false);
    }
  }, [hierarchyStack, t]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleNavigateHierarchy = (subAdmin) => {
    setHierarchyStack((prev) => [
      ...prev,
      {
        id: subAdmin.usuario_id || subAdmin.id,
        name: `${subAdmin.nombre || ''} ${subAdmin.apellido || ''}`.trim() || 'Administrador',
      },
    ]);
  };

  const handlePopHierarchy = (targetIndex) => {
    setHierarchyStack((prev) => prev.slice(0, targetIndex + 1));
  };

  const totals = useMemo(() => {
    let carteraTotal = 0;
    let vencidoTotal = 0;
    let creditosTotal = 0;

    summary.forEach((item) => {
      carteraTotal += parseFloat(item.saldo_total) || 0;
      vencidoTotal += parseFloat(item.saldo_vencido) || 0;
      creditosTotal += parseInt(item.total_creditos, 10) || 0;
    });

    return { carteraTotal, vencidoTotal, creditosTotal };
  }, [summary]);

  const filteredSummary = summary.filter((item) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (item.nombre && item.nombre.toLowerCase().includes(q)) ||
      (item.apellido && item.apellido.toLowerCase().includes(q))
    );
  });

  return (
    <AppBackground>
      <div className="flex flex-col min-h-screen pb-24">
        {/* Header Superior con UserHeaderBadge */}
        <header className="sticky top-0 z-30 bg-white/85 backdrop-blur-md border-b border-slate-200/80 px-4 py-3 flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <h1 className="font-extrabold text-base text-[#1E1E1F] tracking-wide">
              {t('cartera.title') || 'Cartera General'}
            </h1>
            <div className="my-0.5">
              <UserHeaderBadge />
            </div>
            <p className="text-[11px] font-semibold text-slate-500">
              Saldos y Créditos por Vendedor
            </p>
          </div>

          <div className="flex items-center space-x-1.5 shrink-0 ml-2">
            <button
              type="button"
              onClick={loadData}
              title="Refrescar"
              className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
            >
              <Icon name="refresh" size={15} />
            </button>
          </div>
        </header>

        {/* Banner de Facturación */}
        <BillingAlertBanner />

        {/* Migas de pan de jerarquía */}
        <HierarchyBreadcrumb stack={hierarchyStack} onPop={handlePopHierarchy} />

        {/* Banner Estadístico */}
        <div className="px-4 pt-4">
          <div className="bg-gradient-to-br from-[#1E1E1F] to-[#2B2B2E] text-white rounded-3xl p-5 shadow-xl space-y-3">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Total Cartera en Calle
              </span>
              <span className="text-2xl font-black text-white mt-0.5 block">
                {formatCurrency(totals.carteraTotal, userCurrency)}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 border-t border-white/10 pt-3 text-xs">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">
                  Total Vencido
                </span>
                <span
                  className={`font-black ${
                    totals.vencidoTotal > 0 ? 'text-[#EE272D]' : 'text-emerald-400'
                  }`}
                >
                  {formatCurrency(totals.vencidoTotal, userCurrency)}
                </span>
              </div>
              <div className="border-l border-white/10 pl-3">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">
                  Créditos Totales
                </span>
                <span className="font-extrabold text-white">
                  {totals.creditosTotal} créditos
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
              placeholder="Buscar por vendedor..."
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

        {/* Lista de Vendedores */}
        <div className="px-4 mt-3.5 space-y-3">
          {loading ? (
            <div className="text-center py-12">
              <div className="w-8 h-8 border-3 border-[#EE272D] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-xs text-slate-500 font-bold">Cargando cartera...</p>
            </div>
          ) : filteredSummary.length > 0 ? (
            filteredSummary.map((item) => (
              <CarteraUserCard
                key={item.usuario_id || item.id}
                item={item}
                currencyCode={item.currency_code || userCurrency}
                onPress={() => navigate(`/admin-cartera-detalle/${item.usuario_id || item.id}`)}
                onNavigateHierarchy={handleNavigateHierarchy}
              />
            ))
          ) : (
            <div className="bg-white/80 rounded-2xl p-8 text-center border border-slate-200/80 my-4">
              <Icon name="briefcase" size={36} className="mx-auto text-slate-300 mb-2" />
              <p className="text-sm font-bold text-slate-700">No se encontraron registros</p>
              <p className="text-xs text-slate-400 mt-0.5">
                {search ? 'Intenta con otro nombre de vendedor' : 'No hay vendedores con cartera activa'}
              </p>
            </div>
          )}
        </div>
      </div>
    </AppBackground>
  );
}
