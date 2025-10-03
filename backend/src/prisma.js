// Central Prisma client instance. In the Codespaces environment the
// database is optional, so when no DATABASE_URL is configured we expose
// a lightweight stub that simply rejects queries.  This keeps the rest
// of the code paths (and require() calls) working without needing a
// running PostgreSQL instance.
const { PrismaClient } = require('@prisma/client');
const buildPrismaMock = require('./data/mockPrisma');

const prisma = process.env.DATABASE_URL ? new PrismaClient() : buildPrismaMock();

module.exports = prisma;
