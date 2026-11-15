// Throw an HttpError anywhere in a route (sync or async — Express 5 catches both):
//   throw new HttpError(404, 'NOT_FOUND', 'Account not found');
export class HttpError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function notFound(req, _res, next) {
  next(new HttpError(404, 'NOT_FOUND', `No route for ${req.method} ${req.originalUrl}`));
}

// Central error handler -> { ok: false, error: { code, message } }
// Express detects error handlers by arity, so keep all 4 params.
export function errorHandler(err, _req, res, _next) {
  const status = Number(err.status || err.statusCode) || 500;
  const isServerError = status >= 500;

  if (isServerError) console.error(err);

  res.status(status).json({
    ok: false,
    error: {
      code: err.code || (isServerError ? 'INTERNAL_ERROR' : 'BAD_REQUEST'),
      message:
        isServerError && process.env.NODE_ENV === 'production'
          ? 'Internal server error'
          : err.message || 'Something went wrong',
    },
  });
}
