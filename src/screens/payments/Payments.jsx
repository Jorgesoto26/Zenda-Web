import React, { useState, useEffect, useCallback, useMemo } from 'react';
import AppBackground from '../../components/AppBackground';
import Icon from '../../components/Icon';
import ItemPayments from './components/itemPayments';
import AnimatedSegmentedControl from '../../components/AnimatedSegmentedControl';
import UserHeaderBadge from '../../components/UserHeaderBadge';
import BillingAlertBanner from '../../components/BillingAlertBanner';
import { SkeletonList, SkeletonPaymentCard } from '../../components/Skeleton';
import { FormatMoneyDecimales } from '../../utils/utilities';
import { formatCurrency } from '../../utils/currency';
import { calculateCuotasAtrasadas, calculateSaldoVencido } from '../../utils/moraHelper';
import { getInvoicesVendedor } from '../../services/services';
import { getCajaActual } from '../../services/cajaService';
import { getAdminOrganizacion } from '../../services/adminService';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from '../../i18n';
import { eventBus, EVENTS } from '../../utils/eventBus';

export default function Payments() {
  const { userId, profile } = useAuth();
  const { t } = useTranslation();
  const userCurrency = profile?.currency_code || 'COP';

  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [caja, setCaja] = useState(null);
  const [org, setOrg] = useState(null);

  const [activeTab, setActiveTab] = useState('pendientes'); // 'pendientes' | 'cobrados' | 'todos'
  const [search, setSearch] = useState('');

  const loadData = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const [cajaRes, orgRes, invoicesRes] = await Promise.all([
        getCajaActual().catch(() => null),
        getAdminOrganizacion().catch(() => null),
        getInvoicesVendedor(userId).catch(() => []),
      ]);

      setCaja(cajaRes);
      setOrg(orgRes);

      // Enriquecer facturas con mora y saldo vencido calculado
      const enriched = (invoicesRes || []).map((inv) => {
        const cuotasAtrasadas = calculateCuotasAtrasadas(inv);
        const saldoVencido = calculateSaldoVencido(inv, cuotasAtrasadas);
        return {
          ...inv,
          cuotasAtrasadas,
          saldoVencido,
          currency_code: inv.currency_code || userCurrency,
        };
      });

      setInvoices(enriched);
    } catch (e) {
      console.error('Error cargando pagos:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId, userCurrency]);

  useEffect(() => {
    loadData();

    const unsubPay = eventBus.on(EVENTS.PAYMENT_REGISTERED, () => loadData(true));
    const unsubCli = eventBus.on(EVENTS.CLIENT_CREATED, () => loadData(true));
    const unsubMov = eventBus.on(EVENTS.MOVEMENT_CHANGED, () => loadData(true));

    return () => {
      unsubPay();
      unsubCli();
      unsubMov();
    };
  }, [loadData]);

  // Cálculos estadísticos en tiempo real
  const stats = useMemo(() => {
    let cobradoHoy = 0;
    let pendienteTotal = 0;
    let procesados = 0;

    invoices.forEach((inv) => {
      const isActualizado = inv.status === 'ACTUALIZADO' || inv.estadoMovil === 'actualizado';
      if (isActualizado) {
        procesados += 1;
        cobradoHoy += Number(inv.valorCuota || inv.amount || 0);
      } else {
        pendienteTotal += Number(inv.valorCuota || inv.amount || 0);
      }
    });

    const total = invoices.length;
    const progress = total > 0 ? Math.round((procesados / total) * 100) : 0;

    return {
      cobradoHoy,
      pendienteTotal,
      procesados,
      total,
      progress,
    };
  }, [invoices]);

  // Filtrado de lista según pestaña y búsqueda
  const filteredInvoices = useMemo(() => {
    let list = invoices;

    if (activeTab === 'pendientes') {
      list = list.filter((i) => i.status !== 'ACTUALIZADO' && i.estadoMovil !== 'actualizado');
    } else if (activeTab === 'cobrados') {
      list = list.filter((i) => i.status === 'ACTUALIZADO' || i.estadoMovil === 'actualizado');
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (i) =>
          (i.name && i.name.toLowerCase().includes(q)) ||
          (i.documento && i.documento.includes(q)) ||
          (i.address && i.address.toLowerCase().includes(q))
      );
    }

    return list;
  }, [invoices, activeTab, search]);

  return (
    <AppBackground>
      <div className="flex flex-col min-h-screen pb-24">
        {/* Top Header Barra Institucional */}
        <header className="sticky top-0 z-30 bg-white/85 backdrop-blur-md border-b border-slate-200/80 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-white shadow-sm border border-slate-100 flex items-center justify-center p-1">
              <img
                src={org?.logo_path || '/assets/logo.png'}
                alt="Logo"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="font-extrabold text-base text-[#1E1E1F] leading-tight tracking-wide">
                  {t('payments.title')}
                </h1>
              </div>
              <div className="mt-0.5">
                <UserHeaderBadge />
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-1.5">
            <button
              type="button"
              onClick={() => {
                setRefreshing(true);
                loadData(true);
              }}
              title="Refrescar datos"
              className="w-9 h-9 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 flex items-center justify-center transition-colors cursor-pointer"
            >
              <Icon
                name="refresh"
                size={15}
                className={refreshing ? 'animate-spin text-[#EE272D]' : ''}
              />
            </button>
          </div>
        </header>

        {/* Banner de Facturación */}
        <BillingAlertBanner />

        {/* Tarjeta de Resumen Estadístico */}
        <div className="px-4 pt-2">
          <div className="bg-gradient-to-br from-[#1E1E1F] to-[#2B2B2E] text-white rounded-3xl p-5 shadow-xl shadow-slate-900/10">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  {t('payments.collection')} Hoy
                </span>
                <span className="text-2xl font-black text-white mt-0.5 block">
                  {formatCurrency(stats.cobradoHoy, userCurrency)}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  {t('payments.visits')}
                </span>
                <span className="text-xl font-extrabold text-white mt-0.5 block">
                  {stats.progress}%
                </span>
              </div>
            </div>

            {/* Barra de Progreso */}
            <div className="w-full bg-white/20 h-2.5 rounded-full mt-3.5 overflow-hidden">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(0, stats.progress))}%` }}
              />
            </div>

            <div className="flex items-center justify-between mt-3 text-xs text-slate-300 font-medium">
              <span>
                Pendiente:{' '}
                <strong className="text-white">
                  {formatCurrency(stats.pendienteTotal, userCurrency)}
                </strong>
              </span>
              <span>
                {stats.procesados} de {stats.total} {t('payments.clients_label')}
              </span>
            </div>
          </div>
        </div>

        {/* Barra de Búsqueda */}
        <div className="px-4 mt-3">
          <div className="flex items-center bg-white/90 backdrop-blur-sm border border-slate-200/90 rounded-2xl px-3.5 py-2.5 shadow-sm focus-within:border-[#EE272D] focus-within:ring-2 focus-within:ring-[#EE272D]/20 transition-all">
            <Icon name="search" size={15} className="text-slate-400 mr-2.5" />
            <input
              type="text"
              placeholder={t('payments.search_client')}
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

        {/* Segmented Control de Pestañas */}
        <div className="px-4 mt-3">
          <AnimatedSegmentedControl
            options={[
              {
                key: 'pendientes',
                label: t('payments.to_visit'),
                badge: invoices.filter((i) => i.status !== 'ACTUALIZADO' && i.estadoMovil !== 'actualizado')
                  .length,
              },
              {
                key: 'cobrados',
                label: t('payments.processed'),
                badge: invoices.filter((i) => i.status === 'ACTUALIZADO' || i.estadoMovil === 'actualizado')
                  .length,
              },
              {
                key: 'todos',
                label: 'Todos',
                badge: invoices.length,
              },
            ]}
            selectedKey={activeTab}
            onChange={(key) => setActiveTab(key)}
          />
        </div>

        {/* Lista de Clientes / Facturas */}
        <div className="px-4 mt-3.5 space-y-3">
          {loading ? (
            <SkeletonList count={4} ItemComponent={SkeletonPaymentCard} />
          ) : filteredInvoices.length > 0 ? (
            filteredInvoices.map((inv) => (
              <ItemPayments
                key={inv.id}
                id={inv.id}
                name={inv.name}
                address={inv.address}
                amount={inv.amount}
                status={inv.status}
                paymentType={inv.paymentType}
                saldo={inv.saldo}
                cuotasPagas={inv.cuotasPagas}
                saldoVencido={inv.saldoVencido}
                cuotasAtrasadas={inv.cuotasAtrasadas}
                currency_code={inv.currency_code || userCurrency}
                valorCuota={inv.valorCuota}
                onPaymentSuccess={() => loadData(true)}
                telefono={inv.telefono || inv.celular}
                latitud={inv.latitud}
                longitud={inv.longitud}
                documento={inv.documento}
                tipoTramitado={inv.tipoTramitado}
                valorPagado={inv.valorPagado}
                cajaId={caja?.id}
              />
            ))
          ) : (
            <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-8 text-center border border-slate-200/80 my-4">
              <Icon name="check-circle" size={36} className="mx-auto text-slate-300 mb-2" />
              <p className="text-sm font-bold text-slate-700">No hay clientes en esta vista</p>
              <p className="text-xs text-slate-400 mt-0.5">
                {search ? 'Intenta con otro término de búsqueda' : 'Todos los clientes están al día'}
              </p>
            </div>
          )}
        </div>
      </div>
    </AppBackground>
  );
}
