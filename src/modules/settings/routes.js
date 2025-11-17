import { HttpError } from '../../utils/errors.js';
import { ensureAdmin } from '../../utils/auth.js';

async function routes(fastify, _opts, done) {
  fastify.addHook('preHandler', fastify.authenticate);

  fastify.get('/', async () => {
    const { data, error } = await fastify.supabase
      .from('app_settings')
      .select('*')
      .eq('id', 1)
      .maybeSingle();
    if (error) throw new HttpError(500, 'No se pudieron cargar los ajustes');
    return data;
  });

  fastify.put('/', async (request) => {
    ensureAdmin(request);
    const payload = request.body ?? {};
    const { data, error } = await fastify.supabase
      .from('app_settings')
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq('id', 1)
      .select('*')
      .single();
    if (error) throw new HttpError(500, 'No se pudieron actualizar los ajustes');
    return data;
  });

  done();
}

export default routes;
