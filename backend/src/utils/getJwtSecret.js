// Single source of truth for the JWT secret
export default function getJwtSecret() {
  const s = process.env.JWT_SECRET;
  if (typeof s === 'string' && s.trim().length >= 32) return s.trim();
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET is not set or too short (min 32 chars).');
  }
  return 'dev-only-insecure-secret-change-me';
}
