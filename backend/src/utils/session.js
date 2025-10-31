import jwt from 'jsonwebtoken';
import { getJwtSecret } from './jwt.js';

const COOKIE_NAME = 'session';
const ONE_DAY = 24 * 60 * 60; // seconds

function setSessionCookie(res, payload) {
  const token = jwt.sign(payload, getJwtSecret(), { expiresIn: ONE_DAY });
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'none',
    secure: true,            // required on https (Codespaces)
    maxAge: ONE_DAY * 1000,
  });
}

function readSession(req) {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) return null;
  try {
    return jwt.verify(token, getJwtSecret());
  } catch (_) {
    return null;
  }
}

function clearSession(res) {
  res.clearCookie(COOKIE_NAME, { sameSite: 'none', secure: true });
}

export { setSessionCookie, readSession, clearSession };
