// backend/src/config/prismaClient.js
import { PrismaClient } from '@prisma/client';

// Single shared Prisma instance for the whole app
let prisma;

try {
  prisma = new PrismaClient({
    log: ['error', 'warn'],
    errorFormat: 'pretty',
  });
} catch (error) {
  console.error('❌ Failed to initialize Prisma Client:', error.message);
  console.error('This usually means "prisma generate" needs to be run.');
  console.error('Attempting to continue with stub implementation...');

  // Create a stub Prisma client that will fail gracefully
  prisma = new Proxy({}, {
    get(target, prop) {
      if (prop === '$connect') {
        return async () => {
          throw new Error('Prisma Client not properly initialized. Run: npx prisma generate');
        };
      }
      if (prop === '$disconnect') {
        return async () => {};
      }
      if (prop === '$queryRaw') {
        return async () => {
          throw new Error('Prisma Client not properly initialized. Run: npx prisma generate');
        };
      }
      return new Proxy({}, {
        get() {
          return () => {
            throw new Error('Prisma Client not properly initialized. Run: npx prisma generate');
          };
        }
      });
    }
  });
}

export { prisma };
export default prisma;
