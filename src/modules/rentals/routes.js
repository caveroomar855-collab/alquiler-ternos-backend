import dayjs from 'dayjs';
import { HttpError } from '../../utils/errors.js';
import { assertSupabase } from '../../utils/supabase.js';
import { rentalCode } from '../../utils/codes.js';

async function routes(fastify, _opts, done) {
  fastify.addHook('preHandler', fastify.authenticate);

  fastify.get('/', async (request) => {
    const { estado } = request.query ?? {};
    let query = fastify.supabase
      .from('rentals')
      .select('*, rental_items(*)')
      .order('created_at', { ascending: false });
    if (estado) query = query.eq('estado', estado);
    const { data, error } = await query;
    if (error) throw new HttpError(500, 'No se pudo obtener alquileres');
    return data;
  });

  fastify.post('/', async (request, reply) => {
    const {
      cliente_dni,
      fecha_inicio,
      fecha_fin,
      monto_total,
      garantia,
      metodo_pago,
      observaciones,
      items = [],
    } = request.body ?? {};
    if (!cliente_dni || !fecha_inicio || !fecha_fin || !monto_total || !garantia || !metodo_pago) {
      throw new HttpError(400, 'Faltan campos obligatorios');
    }
    if (!Array.isArray(items) || items.length === 0) {
      throw new HttpError(400, 'Debe seleccionar al menos un artículo');
    }

    const codigo = rentalCode();
    const rentalResult = await fastify.supabase
      .from('rentals')
      .insert({
        codigo,
        cliente_dni,
        empleado_id: request.user.sub,
        fecha_inicio,
        fecha_fin,
        monto_total,
        garantia,
        metodo_pago,
        observaciones,
        estado: 'ACTIVO',
      })
      .select('*')
      .single();
    const rental = assertSupabase(rentalResult, 'No se pudo crear el alquiler');

    const itemPayload = items.map((item) => ({
      rental_id: rental.id,
      article_id: item.article_id,
      articulo_tipo_id: item.articulo_tipo_id,
      descripcion_snapshot: item.descripcion_snapshot,
      precio: item.precio ?? 0,
    }));
    if (itemPayload.some((it) => !it.article_id || !it.articulo_tipo_id)) {
      throw new HttpError(400, 'Artículo inválido');
    }

    const insertItems = await fastify.supabase.from('rental_items').insert(itemPayload).select('*');
    if (insertItems.error) throw new HttpError(500, 'No se pudo guardar ítems');

    // Marcar artículos como alquilados
    await Promise.all(
      items.map((item) =>
        fastify.supabase
          .from('articles')
          .update({ estado: 'ALQUILADO', mantenimiento_hasta: dayjs(fecha_fin).toISOString() })
          .eq('id', item.article_id)
      )
    );

    reply.code(201).send({ ...rental, items: insertItems.data });
  });

  fastify.post('/:id/return', async (request) => {
    const { id } = request.params;
    const { estado = 'CERRADO' } = request.body ?? {};
    const update = await fastify.supabase
      .from('rentals')
      .update({ estado, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*')
      .single();
    const rental = assertSupabase(update, 'No se pudo cerrar el alquiler');
    return rental;
  });

  fastify.post('/:id/items/:itemId/state', async (request) => {
    const { itemId } = request.params;
    const { estado, garantia_retenida = 0, comentario = '' } = request.body ?? {};
    if (!estado) throw new HttpError(400, 'Estado requerido');
    const result = await fastify.supabase.rpc('fn_close_rental_item', {
      p_item: itemId,
      p_estado: estado,
      p_reten_g: garantia_retenida,
      p_comentario: comentario,
    });
    if (result.error) throw new HttpError(500, result.error.message);
    const { data, error } = await fastify.supabase
      .from('rental_items')
      .select('*')
      .eq('id', itemId)
      .maybeSingle();
    if (error) throw new HttpError(500, 'No se pudo refrescar el ítem');
    return data;
  });

  done();
}

export default routes;
