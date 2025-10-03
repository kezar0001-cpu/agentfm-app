export function buildApiError(error, fallbackMessage = 'Request failed') {
  if (!error) {
    return new Error(fallbackMessage);
  }

  if (error.response) {
    const { status, data } = error.response;
    const details = typeof data === 'string' ? data : data?.message || data?.error;
    const message = details ? `${status}: ${details}` : `Request failed with status ${status}`;
    const wrapped = new Error(message);
    wrapped.status = status;
    wrapped.payload = data;
    wrapped.cause = error;
    return wrapped;
  }

  if (error.request) {
    const wrapped = new Error('The server did not respond. Please check your network connection.');
    wrapped.cause = error;
    return wrapped;
  }

  return new Error(error.message || fallbackMessage);
}

export function normaliseArray(value) {
  if (Array.isArray(value)) {
    return value;
  }
  if (value == null) {
    return [];
  }
  return [value];
}
