export const DEFAULT_DEV_PROXY_TARGET = 'http://localhost:3000';

export function resolveDevProxyTarget(env = process.env) {
  const raw = env?.VITE_API_BASE_URL;
  if (typeof raw !== 'string') {
    return DEFAULT_DEV_PROXY_TARGET;
  }

  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : DEFAULT_DEV_PROXY_TARGET;
}

export default resolveDevProxyTarget;
