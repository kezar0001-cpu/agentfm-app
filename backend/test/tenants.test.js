import test from 'node:test';
import assert from 'node:assert/strict';
import { buildTenantAccessWhere } from '../src/routes/tenants.js';

test('buildTenantAccessWhere restricts tenants to manager-owned properties', () => {
  const user = { id: 'manager-123', role: 'PROPERTY_MANAGER' };
  const where = buildTenantAccessWhere(user);

  assert.deepEqual(where, {
    role: 'TENANT',
    tenantUnits: {
      some: {
        unit: {
          property: {
            managerId: 'manager-123',
          },
        },
      },
    },
  });
});

test('buildTenantAccessWhere restricts tenants to owner properties', () => {
  const user = { id: 'owner-123', role: 'OWNER' };
  const where = buildTenantAccessWhere(user);

  assert.deepEqual(where, {
    role: 'TENANT',
    tenantUnits: {
      some: {
        unit: {
          property: {
            owners: {
              some: {
                ownerId: 'owner-123',
              },
            },
          },
        },
      },
    },
  });
});

test('buildTenantAccessWhere returns null for unsupported roles', () => {
  const tenantUser = { id: 'tenant-123', role: 'TENANT' };
  const technicianUser = { id: 'tech-123', role: 'TECHNICIAN' };

  assert.equal(buildTenantAccessWhere(tenantUser), null);
  assert.equal(buildTenantAccessWhere(technicianUser), null);
  assert.equal(buildTenantAccessWhere(null), null);
});
