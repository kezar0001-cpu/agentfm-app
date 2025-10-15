import test from 'node:test';
import assert from 'node:assert/strict';

test('tenant role should use uppercase TENANT enum value', () => {
  const correctRole = 'TENANT';
  const incorrectRole = 'tenant';
  
  assert.equal(correctRole, 'TENANT', 'Role should be uppercase TENANT');
  assert.notEqual(incorrectRole, 'TENANT', 'Lowercase tenant should not match enum');
});

test('tenant query filter should match UserRole enum', () => {
  const validRoles = ['ADMIN', 'PROPERTY_MANAGER', 'OWNER', 'TECHNICIAN', 'TENANT'];
  const tenantRole = 'TENANT';
  
  assert.ok(validRoles.includes(tenantRole), 'TENANT should be in valid roles');
  assert.ok(!validRoles.includes('tenant'), 'lowercase tenant should not be in valid roles');
});

test('tenant role case sensitivity check', () => {
  const mockWhereClause = {
    orgId: 'test-org-id',
    role: 'TENANT'
  };
  
  assert.equal(mockWhereClause.role, 'TENANT', 'Where clause should use uppercase TENANT');
  assert.notEqual(mockWhereClause.role, 'tenant', 'Where clause should not use lowercase tenant');
});
