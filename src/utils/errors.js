export class HttpError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}

export function handleRouteError(reply, error) {
  const status = error.statusCode ?? 500;
  reply.code(status).send({ message: error.message ?? 'Error interno' });
}
