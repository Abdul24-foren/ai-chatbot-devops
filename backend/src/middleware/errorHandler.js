import { errorResponse } from '../utils/response.js';

export const notFoundHandler = (req, res) => {
  if (res.headersSent) return;

  return res.status(404).json(
    errorResponse('Route not found.')
  );
};

export const globalErrorHandler = (err, req, res, next) => {
  console.error('Unhandled error:', err);

  if (res.headersSent) {
    return next(err);
  }

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Something went wrong.';

  return res.status(statusCode).json(
    errorResponse(message)
  );
};