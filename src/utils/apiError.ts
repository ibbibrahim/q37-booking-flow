/**
 * Extracts a human-readable message from an axios/API error response.
 */
export function getApiErrorMessage(error: unknown, fallback = 'An error occurred'): string {
  const err = error as { response?: { data?: unknown } };
  const data = err.response?.data;
  if (typeof data === 'string' && data.trim()) return data;
  if (data && typeof data === 'object') {
    const o = data as { message?: string; Message?: string };
    if (typeof o.message === 'string' && o.message.trim()) return o.message;
    if (typeof o.Message === 'string' && o.Message.trim()) return o.Message;
  }
  return fallback;
}
