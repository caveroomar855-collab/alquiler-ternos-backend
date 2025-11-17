import fastifyPlugin from 'fastify-plugin';
import fastifyJwt from '@fastify/jwt';
import { config } from '../config.js';

async function authPlugin(fastify) {
  await fastify.register(fastifyJwt, {
    secret: config.jwtSecret,
    sign: { expiresIn: config.jwtExpiresIn },
  });

  fastify.decorate('authenticate', async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch (err) {
      reply.code(401).send({ message: 'No autorizado' });
      throw err;
    }
  });
}

export default fastifyPlugin(authPlugin);
