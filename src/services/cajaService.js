import { supabase, ensureAuthenticatedSession } from '../lib/supabase';
import { eventBus, EVENTS } from '../utils/eventBus';

export const getDeviceTimezone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Bogota';
  } catch {
    return 'America/Bogota';
  }
};

export async function getCajaActual() {
  try {
    const session = await ensureAuthenticatedSession();
    const userId = session?.user?.id;
    if (!userId) return null;

    // Consultar caja abierta del usuario
    const { data: caja, error } = await supabase
      .from('cajas')
      .select('*')
      .eq('usuario_id', userId)
      .eq('estado', 'abierta')
      .order('fecha_apertura', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !caja) return null;

    // Calcular balance en tiempo real con sus movimientos
    const { data: movs } = await supabase
      .from('cash_movements')
      .select('tipo, monto')
      .eq('caja_id', caja.id);

    let totalCobrado = 0;
    let totalPrestado = 0;
    let totalGastos = 0;
    let totalOtrosIngresos = 0;

    if (movs) {
      movs.forEach((m) => {
        const monto = Number(m.monto) || 0;
        if (m.tipo === 'cobro' || m.tipo === 'pago') totalCobrado += monto;
        else if (m.tipo === 'prestamo' || m.tipo === 'venta') totalPrestado += monto;
        else if (m.tipo === 'gasto') totalGastos += monto;
        else if (m.tipo === 'ingreso') totalOtrosIngresos += monto;
      });
    }

    const saldoInicial = Number(caja.saldo_inicial) || 0;
    const saldoFinal = saldoInicial + totalCobrado + totalOtrosIngresos - totalPrestado - totalGastos;

    return {
      ...caja,
      total_cobrado: totalCobrado,
      total_prestado: totalPrestado,
      total_gastos: totalGastos,
      total_ingresos: totalOtrosIngresos,
      saldo_final: saldoFinal,
    };
  } catch (err) {
    console.warn('Error en getCajaActual:', err);
    return null;
  }
}

export async function abrirCaja({ saldo_inicial = 0 }) {
  const session = await ensureAuthenticatedSession();
  const userId = session?.user?.id;
  if (!userId) throw new Error('Usuario no autenticado');

  const { data, error } = await supabase
    .from('cajas')
    .insert([
      {
        usuario_id: userId,
        saldo_inicial: Number(saldo_inicial) || 0,
        estado: 'abierta',
        fecha_apertura: new Date().toISOString(),
      },
    ])
    .select()
    .single();

  if (error) throw error;
  eventBus.emit(EVENTS.MOVEMENT_CHANGED, data);
  return data;
}

export async function cerrarCaja(cajaId) {
  const session = await ensureAuthenticatedSession();
  const userId = session?.user?.id;
  if (!userId) throw new Error('Usuario no autenticado');

  // Calcular saldo final real
  const actual = await getCajaActual();
  const saldoFinal = actual?.saldo_final ?? (Number(actual?.saldo_inicial) || 0);

  const { data, error } = await supabase
    .from('cajas')
    .update({
      estado: 'cerrada',
      fecha_cierre: new Date().toISOString(),
      saldo_final: saldoFinal,
      total_cobrado: actual?.total_cobrado || 0,
      total_prestado: actual?.total_prestado || 0,
      total_gastos: actual?.total_gastos || 0,
    })
    .eq('id', cajaId)
    .select()
    .single();

  if (error) throw error;
  eventBus.emit(EVENTS.MOVEMENT_CHANGED, data);
  return data;
}

export async function getMovimientosCaja(cajaId, limit = 50) {
  if (!cajaId) return [];
  const { data, error } = await supabase
    .from('cash_movements')
    .select('*')
    .eq('caja_id', cajaId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) return [];
  return data || [];
}

export async function getHistorialCajas(limit = 20) {
  const session = await ensureAuthenticatedSession();
  const userId = session?.user?.id;
  if (!userId) return [];

  const { data, error } = await supabase
    .from('cajas')
    .select('*')
    .eq('usuario_id', userId)
    .eq('estado', 'cerrada')
    .order('fecha_cierre', { ascending: false })
    .limit(limit);

  if (error) return [];
  return data || [];
}

export async function getPendingSyncCount() {
  return 0; // En web las operaciones conectan directamente
}

export async function registrarNoPagosMasivos(facturaIds, cajaId) {
  const session = await ensureAuthenticatedSession();
  const userId = session?.user?.id;
  if (!userId || !facturaIds?.length) return;

  const payloads = facturaIds.map((id) => ({
    invoice_id: id,
    caja_id: cajaId,
    usuario_id: userId,
    monto: 0,
    amount: 0,
    tipo: 'nopago',
    metodo_pago: 'Efectivo',
    nota: 'No pago registrado al cierre de jornada',
    created_at: new Date().toISOString(),
  }));

  const { error } = await supabase.from('payments').insert(payloads);
  if (error) throw error;
  eventBus.emit(EVENTS.PAYMENT_REGISTERED);
}

