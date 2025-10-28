// Single source of truth for the JWT secret
export default function getJwtSecret() {
  const raw = process.env.JWT_SECRET;
  const trimmed = typeof raw === 'string' ? raw.trim() : '';

  if (trimmed.length >= 32) {
    return trimmed;
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET is not set or too short (min 32 chars).');
  }

  if (trimmed.length > 0) {
    return trimmed;
  }

  return 'dev-only-insecure-secret-change-me';
}
