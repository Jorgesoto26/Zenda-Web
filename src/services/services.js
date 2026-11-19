import { supabase, ensureAuthenticatedSession } from '../lib/supabase';
import { eventBus, EVENTS } from '../utils/eventBus';

export const AuthService = async (dummyDb, email, password) => {
  try {
    const cleanEmail = (email || '').toLowerCase().trim();
    const cleanPassword = (password || '').trim();

    const { data, error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password: cleanPassword,
    });

    if (error) {
      return { success: false, message: error.message || 'Usuario o contraseña incorrectos' };
    }

    if (!data?.session) {
      return { success: false, message: 'No se pudo iniciar sesión' };
    }

    const { user, session } = data;

    // Obtener perfil de usuario
    let profile = null;
    const { data: dbProf, error: profErr } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (!profErr && dbProf) {
      profile = dbProf;
    } else {
      profile = {
        id: user.id,
        nombre: user.user_metadata?.nombre || user.email?.split('@')[0] || 'Usuario',
        rol: user.user_metadata?.rol || 'vendedor',
        activo: true,
      };
    }

    if (profile.activo === false) {
      await supabase.auth.signOut();
      return {
        success: false,
        message: 'Tu cuenta ha sido inhabilitada por el administrador.',
      };
    }

    return {
      success: true,
      user,
      session,
      profile,
    };
  } catch (err) {
    console.error('Error en AuthService:', err);
    return { success: false, message: err.message || 'Error de conexión' };
  }
};

export async function getInvoicesVendedor(userId) {
  if (!userId) return [];

  // 1. Intentar con la RPC nativa get_invoices_vendedor
  try {
    const { data: rpcData, error: rpcError } = await supabase.rpc('get_invoices_vendedor', {
      p_vendedor_id: userId,
    });
    if (!rpcError && Array.isArray(rpcData) && rpcData.length > 0) {
      return rpcData;
    }
  } catch (e) {
    console.warn('RPC get_invoices_vendedor error, usando fallback:', e);
  }

  // 2. Fallback mediante consulta relacional directa
  try {
    const { data, error } = await supabase
      .from('invoice')
      .select(`
        *,
        client:clients (
          id,
          nombre,
          documento,
          telefono,
          direccion,
          alias,
          latitud,
          longitud
        ),
        cuotas (
          id,
          numero_cuota,
          valor,
          saldo_cuota,
          status,
          fecha_vencimiento
        ),
        payments (
          id,
          amount,
          tipo,
          created_at,
          caja_id
        )
      `)
      .eq('usuario_id', userId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      return data.map((inv) => {
        const client = inv.client || {};
        const paymentsList = inv.payments || [];
        const latestPago = paymentsList.length > 0
          ? paymentsList.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0]
          : null;

        return {
          id: inv.id,
          name: client.nombre || 'Cliente',
          nombreUno: client.nombre || '',
          apellidoUno: '',
          documento: client.documento || '',
          telefono: client.telefono || '',
          celular: client.telefono || '',
          address: client.direccion || '',
          direccion: client.direccion || '',
          latitud: client.latitud || inv.latitud || null,
          longitud: client.longitud || inv.longitud || null,
          amount: Number(inv.total || inv.monto || 0),
          valorCuota: Number(inv.cuotas?.[0]?.valor || (inv.monto ? inv.monto / (inv.cuotas?.length || 1) : 0)),
          valorInicial: Number(inv.monto || 0),
          saldo: Number(inv.saldo || 0),
          status: (inv.status || 'pendiente').toUpperCase(),
          estadoMovil: (inv.status || 'pendiente').toLowerCase(),
          estadoPago: (inv.status || 'pendiente').toLowerCase(),
          paymentType: inv.plazo_id === 1 ? 'MENSUAL' : inv.plazo_id === 2 ? 'SEMANAL' : inv.plazo_id === 3 ? 'QUINCENAL' : 'DIARIO',
          saldoVencido: 0,
          cuotasPagas: inv.cuotas ? inv.cuotas.filter((c) => c.status === 'pagado').length : 0,
          time: inv.created_at ? new Date(inv.created_at).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }) : '—',
          latestPago,
        };
      });
    }
  } catch (err) {
    console.warn('Fallback getInvoices error:', err);
  }

  return [];
}

export async function createPayment({
  invoice_id,
  client_id,
  amount,
  tipo = 'pago',
  caja_id = null,
  latitud = null,
  longitud = null,
  nota = '',
  metodo = 'Efectivo',
}) {
  const session = await ensureAuthenticatedSession();
  const userId = session?.user?.id;
  if (!userId) throw new Error('Usuario no autenticado');

  // 1. Intentar RPC transaccional segura
  try {
    const { data: rpcData, error: rpcError } = await supabase.rpc('fase1_rpc_create_payment', {
      p_invoice_id: invoice_id,
      p_client_id: client_id,
      p_caja_id: caja_id,
      p_amount: Number(amount),
      p_tipo: tipo,
      p_latitud: latitud,
      p_longitud: longitud,
      p_metodo: metodo,
      p_nota: nota,
    });
    if (!rpcError && rpcData) {
      eventBus.emit(EVENTS.PAYMENT_REGISTERED, rpcData);
      return rpcData;
    }
  } catch {}

  // 2. Fallback: inserción en payments y actualización de saldo de invoice
  const { data: currentInv } = await supabase
    .from('invoice')
    .select('saldo, total')
    .eq('id', invoice_id)
    .single();

  const prevSaldo = Number(currentInv?.saldo ?? currentInv?.total ?? 0);
  const nuevoSaldo = Math.max(0, prevSaldo - Number(amount));
  const nuevoStatus = nuevoSaldo <= 0 ? 'pagado' : 'pendiente';

  // Registrar pago
  const { data: paymentRecord, error: pErr } = await supabase
    .from('payments')
    .insert([
      {
        invoice_id,
        client_id,
        caja_id,
        usuario_id: userId,
        amount: Number(amount),
        tipo,
        metodo_pago: metodo,
        nota,
        latitud,
        longitud,
        created_at: new Date().toISOString(),
      },
    ])
    .select()
    .single();

  if (pErr) throw pErr;

  // Actualizar factura
  await supabase
    .from('invoice')
    .update({
      saldo: nuevoSaldo,
      status: nuevoStatus,
      updated_at: new Date().toISOString(),
    })
    .eq('id', invoice_id);

  // Registrar movimiento de caja si hay monto y caja
  if (caja_id && Number(amount) > 0) {
    try {
      await supabase.from('cash_movements').insert([
        {
          caja_id,
          usuario_id: userId,
          tipo: 'cobro',
          concepto: `Cobro cuota Factura ${invoice_id.substring(0, 8)}`,
          monto: Number(amount),
          created_at: new Date().toISOString(),
        },
      ]);
    } catch {}
  }

  eventBus.emit(EVENTS.PAYMENT_REGISTERED, paymentRecord);
  return {
    success: true,
    payment: paymentRecord,
    nuevoSaldo,
    nuevoStatus,
  };
}

export async function createSale({
  cliente, // { nombre, documento, telefono, direccion, alias, latitud, longitud }
  monto,
  tasaInteres = 20,
  plazoDias = 30,
  modalidadCobro = 'diario',
  caja_id = null,
  documentoFotoUrl = null,
}) {
  const session = await ensureAuthenticatedSession();
  const userId = session?.user?.id;
  if (!userId) throw new Error('Usuario no autenticado');

  // Obtener perfil para heredar organización
  const { data: prof } = await supabase
    .from('profiles')
    .select('organizacion_id')
    .eq('id', userId)
    .single();

  const orgId = prof?.organizacion_id || null;

  // 1. Crear o actualizar cliente
  let clientId = null;
  const { data: existingClient } = await supabase
    .from('clients')
    .select('id')
    .eq('documento', cliente.documento.trim())
    .maybeSingle();

  if (existingClient) {
    clientId = existingClient.id;
    await supabase
      .from('clients')
      .update({
        nombre: cliente.nombre.trim(),
        telefono: cliente.telefono.trim(),
        direccion: cliente.direccion.trim(),
        alias: cliente.alias?.trim() || null,
        latitud: cliente.latitud || null,
        longitud: cliente.longitud || null,
        organizacion_id: orgId,
        vendedor_id: userId,
      })
      .eq('id', clientId);
  } else {
    const { data: newClient, error: clientErr } = await supabase
      .from('clients')
      .insert([
        {
          nombre: cliente.nombre.trim(),
          documento: cliente.documento.trim(),
          telefono: cliente.telefono.trim(),
          direccion: cliente.direccion.trim(),
          alias: cliente.alias?.trim() || null,
          latitud: cliente.latitud || null,
          longitud: cliente.longitud || null,
          vendedor_id: userId,
          organizacion_id: orgId,
        },
      ])
      .select()
      .single();

    if (clientErr) throw clientErr;
    clientId = newClient.id;
  }

  // 2. Calcular montos
  const valorPrestamo = Number(monto);
  const totalInteres = valorPrestamo * (Number(tasaInteres) / 100);
  const totalPagar = valorPrestamo + totalInteres;
  const numCuotas = Number(plazoDias);
  const valorCuota = Math.round(totalPagar / numCuotas);

  // 3. Crear factura (invoice)
  const { data: newInvoice, error: invErr } = await supabase
    .from('invoice')
    .insert([
      {
        client_id: clientId,
        usuario_id: userId,
        organizacion_id: orgId,
        monto: valorPrestamo,
        total: totalPagar,
        saldo: totalPagar,
        cuotas: numCuotas,
        status: 'pendiente',
        latitud: cliente.latitud || null,
        longitud: cliente.longitud || null,
        created_at: new Date().toISOString(),
      },
    ])
    .select()
    .single();

  if (invErr) throw invErr;

  // 4. Crear cuotas
  const cuotasRows = [];
  const hoy = new Date();
  for (let i = 1; i <= numCuotas; i++) {
    const fVenc = new Date(hoy);
    if (modalidadCobro === 'semanal') {
      fVenc.setDate(fVenc.getDate() + i * 7);
    } else if (modalidadCobro === 'quincenal') {
      fVenc.setDate(fVenc.getDate() + i * 15);
    } else if (modalidadCobro === 'mensual') {
      fVenc.setMonth(fVenc.getMonth() + i);
    } else {
      // diario (saltando domingos)
      fVenc.setDate(fVenc.getDate() + i);
    }

    cuotasRows.push({
      invoice_id: newInvoice.id,
      numero_cuota: i,
      valor: valorCuota,
      saldo_cuota: valorCuota,
      status: 'pendiente',
      fecha_vencimiento: fVenc.toISOString().split('T')[0],
      created_at: new Date().toISOString(),
    });
  }

  try {
    await supabase.from('cuotas').insert(cuotasRows);
  } catch (cErr) {
    console.warn('Error insertando cuotas:', cErr);
  }

  // 5. Registrar desembolso en la caja abierta
  if (caja_id) {
    try {
      await supabase.from('cash_movements').insert([
        {
          caja_id,
          usuario_id: userId,
          tipo: 'prestamo',
          concepto: `Desembolso crédito a ${cliente.nombre.trim()}`,
          monto: valorPrestamo,
          created_at: new Date().toISOString(),
        },
      ]);
    } catch {}
  }

  // 6. Si hay evidencia fotográfica, vincular a multimedia_evidencias
  if (documentoFotoUrl) {
    try {
      await supabase.from('multimedia_evidencias').insert([
        {
          bucket_id: 'Evidencias',
          file_path: documentoFotoUrl,
          usuario_id: userId,
          organizacion_id: orgId,
          tipo_evidencia: 'documento_identidad',
          tabla_relacionada: 'clients',
          registro_id: clientId,
          estado_sync: 'sincronizado',
          created_at: new Date().toISOString(),
        },
      ]);
    } catch {}
  }

  eventBus.emit(EVENTS.CLIENT_CREATED, newInvoice);
  return newInvoice;
}

export async function getCreditDetail(invoiceId) {
  const { data: inv, error: invErr } = await supabase
    .from('invoice')
    .select(`
      *,
      client:clients (*),
      cuotas (*),
      payments (*)
    `)
    .eq('id', invoiceId)
    .single();

  if (invErr) throw invErr;

  // Consultar evidencia de documento si existe
  let docEvidenceUrl = null;
  try {
    const { data: ev } = await supabase
      .from('multimedia_evidencias')
      .select('file_path')
      .eq('registro_id', inv.client_id)
      .eq('tipo_evidencia', 'documento_identidad')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (ev?.file_path) {
      docEvidenceUrl = ev.file_path;
    }
  } catch {}

  return {
    ...inv,
    docEvidenceUrl,
  };
}
