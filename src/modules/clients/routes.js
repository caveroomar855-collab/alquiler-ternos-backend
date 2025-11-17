import { HttpError } from '../../utils/errors.js';
import { assertSupabase, buildPagedQuery } from '../../utils/supabase.js';

async function routes(fastify, _opts, done) {
  fastify.addHook('preHandler', fastify.authenticate);

  fastify.get('/', async (request) => {
    const { search, limit, offset } = request.query ?? {};
    let query = fastify.supabase
      .from('clients')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });
    query = buildPagedQuery(query, { search, limit, offset }, ['nombres', 'dni']);
    const { data, error, count } = await query;
    if (error) throw new HttpError(500, 'No se pudo listar clientes');
    return { data, count };
  });

  fastify.post('/', async (request, reply) => {
    const { dni, nombres, telefono, email, descripcion } = request.body ?? {};
    if (!dni || !nombres || !telefono) {
      throw new HttpError(400, 'DNI, nombres y teléfono son requeridos');
    }
    const result = await fastify.supabase
      .from('clients')
      .insert({ dni, nombres, telefono, email, descripcion })
      .select('*')
      .single();
    const data = assertSupabase(result, 'No se pudo crear el cliente');
    reply.code(201).send(data);
  });

  fastify.patch('/:dni', async (request) => {
    const { dni } = request.params;
    const payload = request.body ?? {};
    const result = await fastify.supabase
      .from('clients')
      .update(payload)
      .eq('dni', dni)
      .select('*')
      .single();
    const data = assertSupabase(result, 'No se pudo actualizar el cliente');
    return data;
  });

  fastify.delete('/:dni', async (request, reply) => {
    const { dni } = request.params;
    const result = await fastify.supabase
      .from('clients')
      .delete()
      .eq('dni', dni)
      .select('dni')
      .single();
    assertSupabase(result, 'No se pudo eliminar');
    reply.code(204).send();
  });

  fastify.get('/trash/list', async () => {
    const { data, error } = await fastify.supabase
      .from('clients_trash')
      .select('*')
      .order('deleted_at', { ascending: false });
    if (error) throw new HttpError(500, 'No se pudo cargar la papelera');
    return data;
  });

  done();
}

export default routes;
