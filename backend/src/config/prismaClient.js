// backend/src/config/prismaClient.js
import { PrismaClient } from '@prisma/client';

// Single shared Prisma instance for the whole app
export const prisma = new PrismaClient();

// Allow both: `import prisma from ...` and `import { prisma } from ...`
export default prisma;
