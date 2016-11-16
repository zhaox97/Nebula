import Boom from 'boom';

/**
 * TODO this behavior should be centralized and shared with all plugins
 */
export default function handleError(err, req) {
  req.log(['marvel', 'error'], err); // error stack will also be logged
  if (err.isBoom) return err;
  const msg = err.msg || err.message;
  if (err.statusCode === 403) return Boom.forbidden(msg);
  if (msg === 'Not Found') return Boom.notFound();
  return Boom.badRequest(msg);
}
