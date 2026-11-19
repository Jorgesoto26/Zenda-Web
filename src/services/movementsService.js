import { supabase, ensureAuthenticatedSession } from '../lib/supabase';
import { eventBus, EVENTS } from '../utils/eventBus';

export async function getCurrentLocationOrNull() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          latitud: pos.coords.latitude,
          longitud: pos.coords.longitude,
        });
      },
      () => resolve(null),
      { timeout: 8000, enableHighAccuracy: true }
    );
  });
}

export async function createCashMovement({
  tipo,
  concepto,
  monto,
  descripcion = '',
  caja_id,
  latitud = null,
  longitud = null,
  file_path = null,
}) {
  const session = await ensureAuthenticatedSession();
  const userId = session?.user?.id;
  if (!userId) throw new Error('Usuario no autenticado');

  const loc = (latitud && longitud) ? { latitud, longitud } : await getCurrentLocationOrNull();

  const payload = {
    usuario_id: userId,
    caja_id: caja_id || null,
    tipo: tipo.toLowerCase(),
    concepto: concepto || tipo,
    monto: Number(monto) || 0,
    descripcion: descripcion || '',
    latitud: loc?.latitud || null,
    longitud: loc?.longitud || null,
    file_path: file_path || null,
    created_at: new Date().toISOString(),
  };

  const { data, error } = await supabase.from('cash_movements').insert([payload]).select().single();
  if (error) throw error;

  eventBus.emit(EVENTS.MOVEMENT_CHANGED, data);
  return data;
}

export async function listMovimientos({ cajaId = null, limit = 50 } = {}) {
  const session = await ensureAuthenticatedSession();
  const userId = session?.user?.id;
  if (!userId) return [];

  let query = supabase
    .from('cash_movements')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (cajaId) {
    query = query.eq('caja_id', cajaId);
  } else {
    query = query.eq('usuario_id', userId);
  }

  const { data, error } = await query;
  if (error) {
    console.warn('Error listando movimientos:', error);
    return [];
  }
  return data || [];
}

export async function updateCashMovement(id, updates) {
  const { data, error } = await supabase
    .from('cash_movements')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  eventBus.emit(EVENTS.MOVEMENT_CHANGED, data);
  return data;
}

export async function cancelInvoiceSale(invoiceId, reason = 'Anulación de venta por vendedor') {
  // RPC transaccional segura en Supabase para anular venta y revertir caja
  try {
    const { data: rpcData, error: rpcErr } = await supabase.rpc('rpc_cancel_invoice_sale', {
      p_invoice_id: invoiceId,
      p_motivo: reason,
    });
    if (!rpcErr && rpcData?.success) {
      eventBus.emit(EVENTS.MOVEMENT_CHANGED);
      return rpcData;
    }
  } catch {}

  // Fallback directo sobre la tabla invoice
  const { data, error } = await supabase
    .from('invoice')
    .update({ status: 'anulado', updated_at: new Date().toISOString() })
    .eq('id', invoiceId)
    .select()
    .single();

  if (error) throw error;
  eventBus.emit(EVENTS.MOVEMENT_CHANGED);
  return data;
}

export async function getMovementAudits(movementId) {
  try {
    const { data, error } = await supabase
      .from('cash_movement_audit')
      .select('*')
      .eq('cash_movement_id', movementId)
      .order('created_at', { ascending: false });

    if (!error && data) return data;
  } catch {}
  return [];
}

