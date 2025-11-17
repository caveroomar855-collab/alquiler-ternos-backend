import Fastify from 'fastify';
import cors from '@fastify/cors';
import { config } from './config.js';
import { logger } from './logger.js';
import supabasePlugin from './plugins/supabase.js';
import authPlugin from './plugins/auth.js';
import authRoutes from './modules/auth/routes.js';
import clientRoutes from './modules/clients/routes.js';
import inventoryRoutes from './modules/inventory/routes.js';
import rentalRoutes from './modules/rentals/routes.js';
import salesRoutes from './modules/sales/routes.js';
import reportRoutes from './modules/reports/routes.js';
import settingsRoutes from './modules/settings/routes.js';
import dashboardRoutes from './modules/dashboard/routes.js';

const fastify = Fastify({ logger });

await fastify.register(cors, {
  origin: true,
  credentials: true,
});

await fastify.register(supabasePlugin);
await fastify.register(authPlugin);

fastify.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));

await fastify.register(authRoutes, { prefix: '/auth' });
await fastify.register(dashboardRoutes, { prefix: '/dashboard' });
await fastify.register(clientRoutes, { prefix: '/clients' });
await fastify.register(inventoryRoutes, { prefix: '/inventory' });
await fastify.register(rentalRoutes, { prefix: '/rentals' });
await fastify.register(salesRoutes, { prefix: '/sales' });
await fastify.register(reportRoutes, { prefix: '/reports' });
await fastify.register(settingsRoutes, { prefix: '/settings' });

fastify.setErrorHandler((error, request, reply) => {
  const status = error.statusCode ?? 500;
  request.log.error(error);
  reply.code(status).send({ message: error.message ?? 'Error interno' });
});

fastify.listen({ port: config.port, host: '0.0.0.0' }).catch((err) => {
  fastify.log.error(err, 'Error al iniciar el servidor');
  process.exit(1);
});
