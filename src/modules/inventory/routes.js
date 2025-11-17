import { HttpError } from '../../utils/errors.js';
import { assertSupabase } from '../../utils/supabase.js';

async function routes(fastify, _opts, done) {
  fastify.addHook('preHandler', fastify.authenticate);

  fastify.get('/articles', async (request) => {
    const { estado, tipo, search } = request.query ?? {};
    let query = fastify.supabase
      .from('articles')
      .select('*, article_types(nombre)')
      .order('updated_at', { ascending: false });
    if (estado) query = query.eq('estado', estado);
    if (tipo) query = query.eq('tipo_id', tipo);
    if (search) query = query.ilike('codigo', `%${search}%`);
    const { data, error } = await query;
    if (error) throw new HttpError(500, 'No se pudo obtener el inventario');
    return data;
  });

  fastify.patch('/articles/:id/state', async (request) => {
    const { id } = request.params;
    const { estado, horas = null, motivo = 'AJUSTE_MANUAL', comentario = '' } = request.body ?? {};
    if (!estado) throw new HttpError(400, 'Debe indicar el estado');
    const result = await fastify.supabase.rpc('fn_set_article_state', {
      p_article: id,
      p_state: estado,
      p_hours: horas,
      p_reason: motivo,
      p_comment: comentario,
    });
    if (result.error) throw new HttpError(500, result.error.message);
    const { data, error } = await fastify.supabase
      .from('articles')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw new HttpError(500, 'No se pudo refrescar el artículo');
    return data;
  });

  fastify.post('/articles/:id/maintenance', async (request) => {
    const { id } = request.params;
    const { horas = 24, comentario = '' } = request.body ?? {};
    const result = await fastify.supabase.rpc('fn_set_article_maintenance', {
      p_article: id,
      p_hours: horas,
      p_reason: 'AJUSTE_MANUAL',
      p_comment: comentario,
    });
    if (result.error) throw new HttpError(500, result.error.message);
    return { ok: true };
  });

  fastify.get('/suits', async () => {
    const { data, error } = await fastify.supabase
      .from('suits')
      .select('*, suit_items(*, article_types(nombre))')
      .order('nombre');
    if (error) throw new HttpError(500, 'No se pudo obtener los trajes');
    return data;
  });

  fastify.post('/suits', async (request, reply) => {
    const { nombre, descripcion, piezas = [] } = request.body ?? {};
    if (!nombre) throw new HttpError(400, 'Nombre requerido');
    const result = await fastify.supabase
      .from('suits')
      .insert({ nombre, descripcion })
      .select('*')
      .single();
    const suit = assertSupabase(result, 'No se pudo crear el traje');
    if (piezas.length > 0) {
      const mapped = piezas.map((pieza) => ({
        suit_id: suit.id,
        tipo_id: pieza.tipo_id,
        es_opcional: !!pieza.es_opcional,
      }));
      const insertItems = await fastify.supabase.from('suit_items').insert(mapped).select('*');
      if (insertItems.error) throw new HttpError(500, 'No se pudo guardar las piezas');
      suit.items = insertItems.data;
    }
    reply.code(201).send(suit);
  });

  fastify.patch('/suits/:id', async (request) => {
    const { id } = request.params;
    const { nombre, descripcion, activo, piezas } = request.body ?? {};
    const updateResult = await fastify.supabase
      .from('suits')
      .update({ nombre, descripcion, activo })
      .eq('id', id)
      .select('*')
      .single();
    assertSupabase(updateResult, 'No se pudo actualizar el traje');
    if (Array.isArray(piezas)) {
      await fastify.supabase.from('suit_items').delete().eq('suit_id', id);
      if (piezas.length) {
        await fastify.supabase.from('suit_items').insert(
          piezas.map((p) => ({ suit_id: id, tipo_id: p.tipo_id, es_opcional: !!p.es_opcional }))
        );
      }
    }
    const { data, error } = await fastify.supabase
      .from('suits')
      .select('*, suit_items(*, article_types(nombre))')
      .eq('id', id)
      .maybeSingle();
    if (error) throw new HttpError(500, 'No se pudo refrescar el traje');
    return data;
  });

  done();
}

export default routes;
