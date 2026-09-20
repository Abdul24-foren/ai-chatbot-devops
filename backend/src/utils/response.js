export const successResponse = (data = null) => ({
  success: true,
  data,
});

export const errorResponse = (message, statusCode = 500) => ({
  success: false,
  error: message,
  statusCode,
});

export const normalizeError = (err) => {
  if (err?.name === 'PrismaClientKnownRequestError') {
    const field = err.meta?.target || 'field';
    if (err.code === 'P2002') {
      return `A record with this ${Array.isArray(field) ? field.join(', ') : field} already exists.`;
    }
    if (err.code === 'P2025') {
      return 'The requested record was not found.';
    }
  }

  if (err?.name === 'ValidationError') {
    return err.message;
  }

  return err?.message || 'Something went wrong.';
};
