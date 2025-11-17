import dayjs from 'dayjs';
import { HttpError } from '../../utils/errors.js';

async function routes(fastify, _opts, done) {
  fastify.addHook('preHandler', fastify.authenticate);

  fastify.get('/summary', async () => {
    const todayStart = dayjs().startOf('day').toISOString();
    const todayEnd = dayjs().endOf('day').toISOString();
    const todayDate = dayjs().format('YYYY-MM-DD');

    const [
      activeRentalsResult,
      upcomingResult,
      rentalRevenueResult,
      salesRevenueResult,
      recentRentalsResult,
      recentSalesResult,
    ] = await Promise.all([
      fastify.supabase
        .from('rentals')
        .select('id')
        .eq('estado', 'ACTIVO'),
      fastify.supabase
        .from('rentals')
        .select('id')
        .gte('fecha_inicio', todayDate),
      fastify.supabase
        .from('rentals')
        .select('monto_total, mora_acumulada')
        .gte('created_at', todayStart)
        .lte('created_at', todayEnd),
      fastify.supabase
        .from('sales')
        .select('monto_total')
        .gte('fecha', todayStart)
        .lte('fecha', todayEnd),
      fastify.supabase
        .from('rentals')
        .select('id, codigo, cliente_dni, created_at, estado, monto_total')
        .order('created_at', { ascending: false })
        .limit(5),
      fastify.supabase
        .from('sales')
        .select('id, codigo, cliente_dni, created_at, monto_total')
        .order('created_at', { ascending: false })
        .limit(5),
    ]);

    const supabaseErrors = [
      activeRentalsResult.error,
      upcomingResult.error,
      rentalRevenueResult.error,
      salesRevenueResult.error,
      recentRentalsResult.error,
      recentSalesResult.error,
    ].filter(Boolean);
    if (supabaseErrors.length) {
      throw new HttpError(500, 'No se pudo generar el resumen');
    }

    const activeRentals = activeRentalsResult.data?.length ?? 0;
    const upcomingAppointments = upcomingResult.data?.length ?? 0;
    const rentalRevenue = (rentalRevenueResult.data ?? []).reduce(
      (acc, item) => acc + Number(item.monto_total ?? 0) + Number(item.mora_acumulada ?? 0),
      0,
    );
    const salesRevenue = (salesRevenueResult.data ?? []).reduce(
      (acc, item) => acc + Number(item.monto_total ?? 0),
      0,
    );

    const timeline = [
      ...(recentRentalsResult.data ?? []).map((item) => ({
        id: item.id,
        title: `Alquiler ${item.codigo}`,
        subtitle: `Cliente ${item.cliente_dni}`,
        kind: 'RENTAL',
        timestamp: item.created_at,
        amount: Number(item.monto_total ?? 0),
        status: item.estado,
      })),
      ...(recentSalesResult.data ?? []).map((item) => ({
        id: item.id,
        title: `Venta ${item.codigo}`,
        subtitle: `Cliente ${item.cliente_dni}`,
        kind: 'SALE',
        timestamp: item.created_at,
        amount: Number(item.monto_total ?? 0),
      })),
    ]
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 6);

    return {
      summary: {
        activeRentals,
        upcomingAppointments,
        rentalRevenue,
        salesRevenue,
      },
      timeline,
    };
  });

  done();
}

export default routes;
