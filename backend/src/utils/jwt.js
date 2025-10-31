import jwt from 'jsonwebtoken';

/**
 * Get the JWT secret from environment variables.
 * Throws an error if JWT_SECRET is not set to prevent using insecure fallbacks.
 * 
 * @throws {Error} If JWT_SECRET environment variable is not set
 * @returns {string} The JWT secret
 */
export function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  
  if (!secret) {
    throw new Error(
      'CRITICAL SECURITY ERROR: JWT_SECRET environment variable is not set. ' +
      'This is required for secure authentication. Please set JWT_SECRET to a strong random string (minimum 32 characters).'
    );
  }

  // Warn if the secret is too short (less than 32 characters)
  if (secret.length < 32) {
    console.warn(
      '⚠️  WARNING: JWT_SECRET is shorter than 32 characters. ' +
      'For production use, please use a longer secret (64+ characters recommended).'
    );
  }

  // Warn if using common weak secrets
  const weakSecrets = [
    'your-secret-key',
    'secret',
    'jwt-secret',
    'change-me',
    'replace-this',
    'test-secret',
    '12345678',
    'password',
    'admin'
  ];

  if (weakSecrets.includes(secret.toLowerCase())) {
    throw new Error(
      'CRITICAL SECURITY ERROR: JWT_SECRET is set to a well-known weak value. ' +
      'This is extremely insecure. Please generate a strong random secret using: ' +
      'node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"'
    );
  }

  return secret;
}

/**
 * Sign a JWT token with the configured secret.
 * 
 * @param {object} payload - The data to encode in the token
 * @param {object} options - JWT sign options (expiresIn, etc.)
 * @returns {string} The signed JWT token
 * @throws {Error} If JWT_SECRET is not configured
 */
export function signToken(payload, options = {}) {
  const secret = getJwtSecret();
  return jwt.sign(payload, secret, {
    expiresIn: '7d',
    ...options
  });
}

/**
 * Verify a JWT token with the configured secret.
 * 
 * @param {string} token - The JWT token to verify
 * @param {object} options - JWT verify options
 * @returns {object} The decoded token payload
 * @throws {Error} If JWT_SECRET is not configured or token is invalid
 */
export function verifyToken(token, options = {}) {
  const secret = getJwtSecret();
  return jwt.verify(token, secret, options);
}

/**
 * Decode a JWT token without verification (for debugging only).
 * WARNING: This does not verify the token signature!
 * 
 * @param {string} token - The JWT token to decode
 * @returns {object|null} The decoded token payload or null if invalid
 */
export function decodeToken(token) {
  return jwt.decode(token);
}
