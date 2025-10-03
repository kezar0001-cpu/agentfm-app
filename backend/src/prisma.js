// Central Prisma client instance. In the Codespaces environment the
// database is optional, so when no DATABASE_URL is configured we expose
// a lightweight stub that simply rejects queries.  This keeps the rest
// of the code paths (and require() calls) working without needing a
// running PostgreSQL instance.
const { PrismaClient } = require('@prisma/client');

function createStubClient() {
  const modelHandler = (modelName) => ({
    get(_target, method) {
      if (method === '$transaction') {
        return async () => {
          throw new Error(`Database not configured. Cannot run transactions on ${modelName}.`);
        };
      }
      if (method === '$queryRaw' || method === '$executeRaw') {
        return async () => {
          throw new Error(`Database not configured. Cannot execute raw queries on ${modelName}.`);
        };
      }
      if (method === 'then') return undefined;
      return async () => {
        throw new Error(`Database not configured. ${modelName}.${String(method)} is unavailable.`);
      };
    },
  });

  return new Proxy(
    {},
    {
      get(_target, prop) {
        if (prop === '$disconnect' || prop === '$connect') {
          return async () => {};
        }
        return new Proxy({}, modelHandler(prop));
      },
    },
  );
}

const prisma = process.env.DATABASE_URL ? new PrismaClient() : createStubClient();

module.exports = prisma;
