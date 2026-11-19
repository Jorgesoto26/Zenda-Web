import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import AppBackground from '../../components/AppBackground';
import Icon from '../../components/Icon';
import UserHeaderBadge from '../../components/UserHeaderBadge';
import BillingAlertBanner from '../../components/BillingAlertBanner';
import { FormatMoneyDecimales } from '../../utils/utilities';
import { formatCurrency } from '../../utils/currency';
import { getAdminMorosos, castigarCartera } from '../../services/adminService';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from '../../i18n';
import { appAlert } from '../../components/AppAlert';

export default function AdminMorosos() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { isReadOnly, profile } = useAuth();
  const userCurrency = profile?.currency_code || 'COP';

  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAdminMorosos(50);
      setItems(data || []);
    } catch (e) {
      console.error('Error cargando morosos:', e);
      appAlert(t('common.error'), e.message || 'No se pudieron cargar los morosos');
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCastigar = async (invoiceId) => {
    if (isReadOnly) {
      appAlert(
        'Modo Solo Lectura',
        'Tu cuenta se encuentra en periodo de gracia por facturación pendiente. No es posible castigar créditos.'
      );
      return;
    }

    appAlert(
      'Castigar Cartera',
      '¿Estás seguro de que deseas castigar (bloquear) este crédito en mora irreversible?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sí, Castigar',
          style: 'destructive',
          onPress: async () => {
            try {
              await castigarCartera(invoiceId);
              appAlert('Éxito', 'Crédito castigado correctamente');
              loadData();
            } catch (err) {
              appAlert(t('common.error'), err.message);
            }
          },
        },
      ]
    );
  };

  const handleOpenWhatsApp = (tel) => {
    if (!tel) return appAlert('Sin teléfono', 'Este cliente no tiene teléfono.');
    const cleanNum = tel.replace(/\D/g, '');
    const waUrl = cleanNum.startsWith('57') ? `https://wa.me/${cleanNum}` : `https://wa.me/57${cleanNum}`;
    window.open(waUrl, '_blank');
  };

  const filteredItems = useMemo(() => {
    return items.filter((m) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        (m.cliente_nombre && m.cliente_nombre.toLowerCase().includes(q)) ||
        (m.vendedor_nombre && m.vendedor_nombre.toLowerCase().includes(q)) ||
        (m.cliente_documento && m.cliente_documento.includes(q))
      );
    });
  }, [items, search]);

  return (
    <AppBackground>
      <div className="flex flex-col min-h-screen pb-24">
        {/* Header Superior con UserHeaderBadge */}
        <header className="sticky top-0 z-30 bg-white/85 backdrop-blur-md border-b border-slate-200/80 px-4 py-3 flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <h1 className="font-extrabold text-base text-[#1E1E1F] tracking-wide">
              {t('morosos.title') || 'Control de Morosos'}
            </h1>
            <div className="my-0.5">
              <UserHeaderBadge />
            </div>
            <p className="text-[11px] font-semibold text-slate-500">
              Top Créditos en Mora
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

        {/* Buscador */}
        <div className="px-4 mt-3">
          <div className="flex items-center bg-white/90 backdrop-blur-sm border border-slate-200/90 rounded-2xl px-3.5 py-2.5 shadow-sm focus-within:border-[#EE272D]">
            <Icon name="search" size={15} className="text-slate-400 mr-2.5" />
            <input
              type="text"
              placeholder="Buscar por cliente o vendedor..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-transparent text-sm text-[#1E1E1F] font-medium outline-none placeholder:text-slate-400"
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

        {/* Listado de Morosos */}
        <div className="px-4 mt-3.5 space-y-3 max-w-lg mx-auto w-full">
          {loading ? (
            <div className="text-center py-12">
              <div className="w-7 h-7 border-2 border-[#EE272D] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-xs text-slate-400 font-medium">Cargando créditos morosos...</p>
            </div>
          ) : filteredItems.length > 0 ? (
            filteredItems.map((item) => (
              <div
                key={item.invoice_id || item.id}
                className="bg-white/95 backdrop-blur-sm rounded-2xl p-4 shadow-sm border border-slate-200/90 space-y-3 transition-all hover:shadow-md"
              >
                <div className="flex items-start justify-between">
                  <div
                    className="flex-1 cursor-pointer pr-2"
                    onClick={() => navigate(`/credit-detail/${item.invoice_id || item.id}`)}
                  >
                    <h3 className="font-bold text-base text-[#1E1E1F] hover:text-[#EE272D] transition-colors leading-tight">
                      {item.cliente_nombre}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Vendedor: <span className="font-semibold text-slate-700">{item.vendedor_nombre}</span>
                    </p>
                  </div>

                  <div className="flex flex-col items-end shrink-0">
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-red-50 text-red-600 border border-red-200">
                      {item.dias_mora || item.cuotas_vencidas || 0} cuotas vencidas
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 bg-red-50/50 rounded-xl p-2.5 border border-red-100 text-center">
                  <div>
                    <span className="text-[10px] text-slate-500 font-bold uppercase block">
                      Saldo Restante
                    </span>
                    <span className="text-sm font-black text-[#EE272D]">
                      {formatCurrency(item.saldo, item.currency_code || userCurrency)}
                    </span>
                  </div>
                  <div className="border-l border-red-200/60">
                    <span className="text-[10px] text-slate-500 font-bold uppercase block">
                      Monto en Mora
                    </span>
                    <span className="text-sm font-black text-red-900">
                      {formatCurrency(item.saldo_vencido || item.mora, item.currency_code || userCurrency)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                  <div className="flex items-center space-x-2">
                    {item.cliente_celular || item.cliente_telefono ? (
                      <button
                        type="button"
                        onClick={() => handleOpenWhatsApp(item.cliente_celular || item.cliente_telefono)}
                        className="px-2.5 py-1.5 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 text-xs font-bold flex items-center space-x-1 hover:bg-emerald-100 transition-colors cursor-pointer"
                      >
                        <Icon name="whatsapp" size={13} />
                        <span>WhatsApp</span>
                      </button>
                    ) : null}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleCastigar(item.invoice_id || item.id)}
                    className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-600 border border-slate-200 text-xs font-bold flex items-center space-x-1 transition-colors cursor-pointer"
                  >
                    <Icon name="ban" size={13} />
                    <span>Castigar</span>
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="bg-white/80 rounded-2xl p-8 text-center border border-slate-200/80 my-4">
              <Icon name="check-circle" size={36} className="mx-auto text-emerald-400 mb-2" />
              <p className="text-sm font-bold text-slate-700">Sin morosidad crítica</p>
              <p className="text-xs text-slate-400 mt-0.5">
                {search ? 'No hay coincidencias para la búsqueda' : 'No hay clientes con atraso crítico'}
              </p>
            </div>
          )}
        </div>
      </div>
    </AppBackground>
  );
}
