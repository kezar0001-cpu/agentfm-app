import jwt from 'jsonwebtoken';
import getJwtSecret from './getJwtSecret.js';

const SECRET = getJwtSecret();

export function signToken(payload, opts = {}) {
  // default 7 days
  const options = { expiresIn: '7d', ...opts };
  return jwt.sign(payload, SECRET, options);
}

export function verifyToken(token) {
  return jwt.verify(token, SECRET);
}

export function decodeToken(token) {
  return jwt.decode(token);
}

export { getJwtSecret };
