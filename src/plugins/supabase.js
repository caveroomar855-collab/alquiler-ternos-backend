import fastifyPlugin from 'fastify-plugin';
import { createClient } from '@supabase/supabase-js';
import { config } from '../config.js';

async function supabasePlugin(fastify) {
  const client = createClient(config.supabaseUrl, config.supabaseServiceKey, {
    auth: { persistSession: false },
  });

  fastify.decorate('supabase', client);
}

export default fastifyPlugin(supabasePlugin);
