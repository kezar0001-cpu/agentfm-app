// Single source of truth for the JWT secret
const DEFAULT_JWT_SECRET = 'ed4579c94dee0cf3ecffc3dbbfe7ab0b';

export default function getJwtSecret() {
  const s = process.env.JWT_SECRET;
  if (typeof s === 'string' && s.trim().length > 0) return s.trim();
  return DEFAULT_JWT_SECRET;
}
