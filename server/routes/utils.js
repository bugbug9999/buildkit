export function ok(res, data, pagination) {
  const body = { success: true, data };
  if (pagination) {
    body.pagination = pagination;
  }
  return res.json(body);
}

export function fail(res, code, message, status = 400) {
  return res.status(status).json({
    success: false,
    error: { code, message },
  });
}
