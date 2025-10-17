const DEFAULT_JWT_SECRET = 'your-secret-key';

export function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (typeof secret === 'string') {
    const trimmed = secret.trim();
    if (trimmed.length > 0) {
      return trimmed;
    }
  }
  return DEFAULT_JWT_SECRET;
}

export default getJwtSecret;
