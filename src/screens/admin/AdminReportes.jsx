import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import AppBackground from '../../components/AppBackground';
import Icon from '../../components/Icon';
import AnimatedSegmentedControl from '../../components/AnimatedSegmentedControl';
import UserHeaderBadge from '../../components/UserHeaderBadge';
import BillingAlertBanner from '../../components/BillingAlertBanner';
import BillingSection from './components/BillingSection';
import { FormatMoneyDecimales } from '../../utils/utilities';
import { formatCurrency } from '../../utils/currency';
import { getReporteConsolidado } from '../../services/adminService';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from '../../i18n';
import { appAlert } from '../../components/AppAlert';

const getTodayIso = () => new Date().toISOString().split('T')[0];
const getFirstDayOfMonthIso = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
};

export default function AdminReportes() {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'consolidado';

  const [tipo, setTipo] = useState(initialTab);
  const [fechaIni, setFechaIni] = useState(getFirstDayOfMonthIso());
  const [fechaFin, setFechaFin] = useState(getTodayIso());
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  const userCurrency = profile?.currency_code || 'COP';

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getReporteConsolidado(fechaIni, fechaFin);
      setData(res || []);
    } catch (e) {
      console.error('Error cargando reportes:', e);
      appAlert(t('common.error'), e.message || 'No se pudo generar el reporte');
    } finally {
      setLoading(false);
    }
  }, [fechaIni, fechaFin, t]);

  useEffect(() => {
    if (tipo !== 'facturacion') {
      loadData();
    }
  }, [loadData, tipo]);

  // Sincronizar tab desde URL si cambia
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam && tabParam !== tipo) {
      setTipo(tabParam);
    }
  }, [searchParams, tipo]);

  const handleTabChange = (newKey) => {
    setTipo(newKey);
    setSearchParams(newKey === 'consolidado' ? {} : { tab: newKey });
  };

  // Totales acumulados
  const totals = useMemo(() => {
    let prestado = 0;
    let cobrado = 0;
    let gastos = 0;
    let ingresos = 0;

    data.forEach((row) => {
      prestado += parseFloat(row.total_prestado || row.total_ventas) || 0;
      cobrado += parseFloat(row.total_cobrado || row.total_recaudo) || 0;
      gastos += parseFloat(row.total_gastos) || 0;
      ingresos += parseFloat(row.total_ingresos) || 0;
    });

    const flujoNeto = cobrado + ingresos - prestado - gastos;

    return { prestado, cobrado, gastos, ingresos, flujoNeto };
  }, [data]);

  return (
    <AppBackground>
      <div className="flex flex-col min-h-screen pb-24">
        {/* Header Superior con UserHeaderBadge */}
        <header className="sticky top-0 z-30 bg-white/85 backdrop-blur-md border-b border-slate-200/80 px-4 py-3 flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <h1 className="font-extrabold text-base text-[#1E1E1F] tracking-wide">
              {t('reports.title')}
            </h1>
            <div className="my-0.5">
              <UserHeaderBadge />
            </div>
            <p className="text-[11px] font-semibold text-slate-500 truncate">
              {t('reports.subtitle')}
            </p>
          </div>

          <div className="flex items-center space-x-1.5 shrink-0 ml-2">
            <button
              type="button"
              onClick={loadData}
              title="Refrescar"
              className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200 cursor-pointer transition-colors"
            >
              <Icon name="refresh" size={15} />
            </button>
          </div>
        </header>

        {/* Selector de Tipo / Pestañas de Reportes y Facturación */}
        <div className="px-4 my-2.5">
          <AnimatedSegmentedControl
            options={[
              { key: 'consolidado', label: t('reports.tab_consolidated') },
              { key: 'gasto', label: t('reports.tab_expenses') },
              { key: 'movimiento', label: t('reports.tab_movements') },
              { key: 'facturacion', label: t('reports.tab_billing') },
            ]}
            selectedKey={tipo}
            onChange={handleTabChange}
          />
        </div>

        {/* Banner de alerta de facturación si no está en la pestaña de facturación */}
        {tipo !== 'facturacion' && (
          <BillingAlertBanner onPress={() => handleTabChange('facturacion')} />
        )}

        {/* Contenido Condicional: Facturación vs Reportes Operativos */}
        {tipo === 'facturacion' ? (
          <BillingSection onRefreshGlobal={loadData} />
        ) : (
          <>
            {/* Selector de Rango de Fechas */}
            <div className="px-4">
              <div className="bg-white/95 backdrop-blur-sm rounded-3xl p-4 shadow-sm border border-slate-200/80 space-y-3">
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                      Fecha Inicial
                    </label>
                    <input
                      type="date"
                      value={fechaIni}
                      onChange={(e) => setFechaIni(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none text-[#1E1E1F]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                      Fecha Final
                    </label>
                    <input
                      type="date"
                      value={fechaFin}
                      onChange={(e) => setFechaFin(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none text-[#1E1E1F]"
                    />
                  </div>
                </div>

                {/* Accesos rápidos de fecha */}
                <div className="flex items-center space-x-2 pt-1 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      setFechaIni(getTodayIso());
                      setFechaFin(getTodayIso());
                    }}
                    className="flex-1 py-1 px-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] cursor-pointer"
                  >
                    Hoy
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const d = new Date();
                      d.setDate(d.getDate() - 7);
                      setFechaIni(d.toISOString().split('T')[0]);
                      setFechaFin(getTodayIso());
                    }}
                    className="flex-1 py-1 px-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] cursor-pointer"
                  >
                    7 Días
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFechaIni(getFirstDayOfMonthIso());
                      setFechaFin(getTodayIso());
                    }}
                    className="flex-1 py-1 px-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] cursor-pointer"
                  >
                    Este Mes
                  </button>
                </div>
              </div>
            </div>

            {/* Tarjeta de Resumen General */}
            <div className="px-4 mt-3.5">
              <div className="bg-gradient-to-br from-[#1E1E1F] to-[#2B2B2E] text-white rounded-3xl p-5 shadow-xl space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Flujo Neto en Período
                    </span>
                    <span
                      className={`text-2xl font-black mt-0.5 block ${
                        totals.flujoNeto >= 0 ? 'text-emerald-400' : 'text-[#EE272D]'
                      }`}
                    >
                      {formatCurrency(totals.flujoNeto, userCurrency)}
                    </span>
                  </div>
                  <span className="text-xs text-slate-300 font-medium bg-white/10 px-2.5 py-1 rounded-full">
                    {data.length} vendedores
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 border-t border-white/10 pt-3 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[9px] uppercase font-bold">
                      Total Recaudado
                    </span>
                    <span className="font-extrabold text-emerald-400">
                      +{formatCurrency(totals.cobrado, userCurrency)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[9px] uppercase font-bold">
                      Total Desembolsado
                    </span>
                    <span className="font-extrabold text-slate-200">
                      -{formatCurrency(totals.prestado, userCurrency)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[9px] uppercase font-bold">
                      Gastos Operativos
                    </span>
                    <span className="font-extrabold text-red-400">
                      -{formatCurrency(totals.gastos, userCurrency)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[9px] uppercase font-bold">
                      Otros Ingresos
                    </span>
                    <span className="font-extrabold text-slate-200">
                      +{formatCurrency(totals.ingresos, userCurrency)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Desglose por Vendedor */}
            <div className="px-4 mt-4 space-y-3 max-w-lg mx-auto w-full">
              <h3 className="font-bold text-sm text-[#1E1E1F]">Rendimiento por Vendedor</h3>

              {loading ? (
                <div className="text-center py-12">
                  <div className="w-7 h-7 border-2 border-[#EE272D] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  <p className="text-xs text-slate-400 font-medium">Generando consolidado...</p>
                </div>
              ) : data.length > 0 ? (
                data.map((row, idx) => (
                  <div
                    key={row.usuario_id || idx}
                    className="bg-white/95 backdrop-blur-sm rounded-2xl p-4 shadow-sm border border-slate-200/80 space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-sm text-[#1E1E1F]">
                        {row.nombre_usuario || row.vendedor_nombre || 'Vendedor'}
                      </h4>
                      <span className="text-xs font-black text-emerald-600">
                        +{formatCurrency(row.total_cobrado || row.total_recaudo, userCurrency)}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 bg-slate-50/70 rounded-xl p-2.5 border border-slate-100 text-center text-xs">
                      <div>
                        <span className="text-[9px] text-slate-400 font-bold uppercase block">
                          Préstamos
                        </span>
                        <span className="font-bold text-slate-700">
                          {formatCurrency(row.total_prestado || row.total_ventas, userCurrency)}
                        </span>
                      </div>
                      <div className="border-x border-slate-200/80">
                        <span className="text-[9px] text-slate-400 font-bold uppercase block">
                          Gastos
                        </span>
                        <span className="font-bold text-red-600">
                          {formatCurrency(row.total_gastos, userCurrency)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 font-bold uppercase block">
                          Saldo Actual
                        </span>
                        <span className="font-bold text-slate-900">
                          {formatCurrency(row.saldo_cartera_actual || 0, userCurrency)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="bg-white/80 rounded-2xl p-8 text-center border border-slate-200">
                  <p className="text-xs font-bold text-slate-500">
                    No hay registros en el rango seleccionado
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </AppBackground>
  );
}
