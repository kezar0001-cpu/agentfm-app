// backend/src/utils/jwt.js
export function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret || !secret.trim()) {
    throw new Error('JWT_SECRET is not set in environment');
  }
  return secret.trim();
}

export default getJwtSecret;