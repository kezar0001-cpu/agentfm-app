// Central Prisma client instance.  Import this module wherever
// database access is required.  Prisma maintains a connection pool
// internally, so creating multiple clients can lead to socket
// exhaustion.  See https://www.prisma.io/docs/prisma-client/setup-and-usage for details.
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

module.exports = prisma;