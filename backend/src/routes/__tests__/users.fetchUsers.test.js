import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fetchUsersForManagedProperties } from '../users.js';

const BASIC_RESULT = {
  id: 'user-1',
  firstName: 'Ada',
  lastName: 'Lovelace',
  email: 'ada@example.com',
  role: 'OWNER',
};

test('fetchUsersForManagedProperties returns owners for managed properties', async () => {
  let receivedArgs = null;
  const prismaMock = {
    propertyOwner: {
      async findMany(args) {
        receivedArgs = args;
        return [
          { owner: { ...BASIC_RESULT } },
          { owner: null },
        ];
      },
    },
    unitTenant: {
      async findMany() {
        throw new Error('unitTenant.findMany should not be called for OWNER role');
      },
    },
    user: {
      async findMany() {
        throw new Error('user.findMany should not be called for OWNER role');
      },
    },
  };

  const users = await fetchUsersForManagedProperties(prismaMock, ['prop-1', null], 'OWNER');

  assert.equal(users.length, 1);
  assert.deepEqual(users[0], BASIC_RESULT);
  assert.deepEqual(receivedArgs.where, { propertyId: { in: ['prop-1'] } });
  assert.deepEqual(Object.keys(receivedArgs.include.owner.select).sort(), ['email', 'firstName', 'id', 'lastName', 'role']);
});

test('fetchUsersForManagedProperties returns active tenants for managed properties', async () => {
  let receivedArgs = null;
  const tenantResult = {
    id: 'tenant-1',
    firstName: 'Terry',
    lastName: 'Tenant',
    email: 'tenant@example.com',
    role: 'TENANT',
  };
  const prismaMock = {
    propertyOwner: {
      async findMany() {
        throw new Error('propertyOwner.findMany should not be called for TENANT role');
      },
    },
    unitTenant: {
      async findMany(args) {
        receivedArgs = args;
        return [
          { tenant: tenantResult },
          { tenant: null },
        ];
      },
    },
    user: {
      async findMany() {
        throw new Error('user.findMany should not be called for TENANT role');
      },
    },
  };

  const users = await fetchUsersForManagedProperties(prismaMock, ['prop-1'], 'TENANT');

  assert.equal(users.length, 1);
  assert.deepEqual(users[0], tenantResult);
  assert.equal(receivedArgs.where.isActive, true);
  assert.deepEqual(receivedArgs.where.unit, { propertyId: { in: ['prop-1'] } });
});

test('fetchUsersForManagedProperties returns technicians when requested', async () => {
  const technicianResult = {
    id: 'tech-1',
    firstName: 'Tech',
    lastName: 'Person',
    email: 'tech@example.com',
    role: 'TECHNICIAN',
  };

  let receivedArgs = null;
  const prismaMock = {
    propertyOwner: {
      async findMany() {
        throw new Error('propertyOwner.findMany should not be called for TECHNICIAN role');
      },
    },
    unitTenant: {
      async findMany() {
        throw new Error('unitTenant.findMany should not be called for TECHNICIAN role');
      },
    },
    user: {
      async findMany(args) {
        receivedArgs = args;
        return [technicianResult];
      },
    },
  };

  const users = await fetchUsersForManagedProperties(prismaMock, ['prop-1'], 'TECHNICIAN');

  assert.equal(users.length, 1);
  assert.deepEqual(users[0], technicianResult);
  assert.deepEqual(receivedArgs.where, { role: 'TECHNICIAN' });
});

test('fetchUsersForManagedProperties skips queries when property list is empty', async () => {
  const prismaMock = {
    propertyOwner: {
      async findMany() {
        throw new Error('should not query owners when there are no properties');
      },
    },
    unitTenant: {
      async findMany() {
        throw new Error('should not query tenants when there are no properties');
      },
    },
    user: {
      async findMany() {
        return [];
      },
    },
  };

  const owners = await fetchUsersForManagedProperties(prismaMock, [], 'OWNER');
  const tenants = await fetchUsersForManagedProperties(prismaMock, undefined, 'TENANT');

  assert.deepEqual(owners, []);
  assert.deepEqual(tenants, []);
});
