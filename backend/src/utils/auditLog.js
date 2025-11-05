import { prisma } from '../config/prismaClient.js';

/**
 * Create an audit log entry
 * @param {Object} options
 * @param {string} options.entityType - Type of entity (e.g., 'ServiceRequest', 'Job', 'Property')
 * @param {string} options.entityId - ID of the entity
 * @param {string} options.action - Action performed (e.g., 'CREATED', 'UPDATED', 'DELETED', 'APPROVED', 'REJECTED')
 * @param {string} options.userId - ID of user who performed the action
 * @param {Object} [options.changes] - Before/after changes (optional)
 * @param {Object} [options.metadata] - Additional context (optional)
 * @param {Object} [options.req] - Express request object for IP and user agent (optional)
 */
export async function logAudit({
  entityType,
  entityId,
  action,
  userId,
  changes = null,
  metadata = null,
  req = null
}) {
  try {
    await prisma.auditLog.create({
      data: {
        entityType,
        entityId,
        action,
        userId,
        changes,
        metadata,
        ipAddress: req?.ip || null,
        userAgent: req?.get('user-agent') || null,
      }
    });

    console.log(`[AUDIT] ${action} on ${entityType}:${entityId} by user:${userId}`);
  } catch (error) {
    // CRITICAL: Audit logging should never break business logic
    console.error('Failed to create audit log:', error);
    // We don't throw here - audit logs are important but not critical
  }
}

/**
 * Get audit logs for a specific entity
 * @param {string} entityType
 * @param {string} entityId
 * @param {number} limit
 * @returns {Promise<Array>}
 */
export async function getAuditLogs(entityType, entityId, limit = 50) {
  try {
    return await prisma.auditLog.findMany({
      where: {
        entityType,
        entityId,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    });
  } catch (error) {
    console.error('Failed to fetch audit logs:', error);
    return [];
  }
}

/**
 * Get audit logs for a specific user
 * @param {string} userId
 * @param {number} limit
 * @returns {Promise<Array>}
 */
export async function getUserAuditLogs(userId, limit = 50) {
  try {
    return await prisma.auditLog.findMany({
      where: {
        userId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    });
  } catch (error) {
    console.error('Failed to fetch user audit logs:', error);
    return [];
  }
}

/**
 * Helper to format changes object
 * @param {Object} before
 * @param {Object} after
 * @returns {Object}
 */
export function formatChanges(before, after) {
  const changes = {};

  // Compare all keys in both objects
  const allKeys = new Set([...Object.keys(before || {}), ...Object.keys(after || {})]);

  for (const key of allKeys) {
    if (JSON.stringify(before?.[key]) !== JSON.stringify(after?.[key])) {
      changes[key] = {
        before: before?.[key],
        after: after?.[key],
      };
    }
  }

  return Object.keys(changes).length > 0 ? changes : null;
}
