import { HttpError } from '../../utils/errors.js';
import { assertSupabase } from '../../utils/supabase.js';
import { saleCode } from '../../utils/codes.js';

async function routes(fastify, _opts, done) {
  fastify.addHook('preHandler', fastify.authenticate);

  fastify.get('/', async () => {
    const { data, error } = await fastify.supabase
      .from('sales')
      .select('*, sale_items(*)')
      .order('fecha', { ascending: false });
    if (error) throw new HttpError(500, 'No se pudo obtener ventas');
    return data;
  });

  fastify.post('/', async (request, reply) => {
    const { cliente_dni, monto_total, metodo_pago, observaciones, items = [] } = request.body ?? {};
    if (!cliente_dni || !monto_total || !metodo_pago) {
      throw new HttpError(400, 'Campos obligatorios faltantes');
    }
    if (!Array.isArray(items) || items.length === 0) {
      throw new HttpError(400, 'Debe agregar artículos');
    }
    const codigo = saleCode();
    const saleResult = await fastify.supabase
      .from('sales')
      .insert({
        codigo,
        cliente_dni,
        empleado_id: request.user.sub,
        monto_total,
        metodo_pago,
        observaciones,
      })
      .select('*')
      .single();
    const sale = assertSupabase(saleResult, 'No se pudo registrar la venta');

    const itemPayload = items.map((item) => ({
      sale_id: sale.id,
      article_id: item.article_id,
      articulo_tipo_id: item.articulo_tipo_id,
      descripcion_snapshot: item.descripcion_snapshot,
      precio: item.precio ?? 0,
    }));
    const insertItems = await fastify.supabase.from('sale_items').insert(itemPayload).select('*');
    if (insertItems.error) throw new HttpError(500, 'No se pudo guardar ítems');

    reply.code(201).send({ ...sale, items: insertItems.data });
  });

  fastify.post('/:id/return', async (request) => {
    const { id } = request.params;
    const { article_id, motivo } = request.body ?? {};
    if (!article_id) throw new HttpError(400, 'Artículo requerido');
    const result = await fastify.supabase
      .from('sale_returns')
      .insert({ sale_id: id, article_id, motivo, aprobado: false })
      .select('*')
      .single();
    const data = assertSupabase(result, 'No se pudo registrar la devolución');
    return data;
  });

  done();
}

export default routes;
