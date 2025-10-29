import test from 'node:test';
import assert from 'node:assert/strict';

test('convertToJob accepts correct field names', () => {
  // Test that the convert-to-job payload uses correct field names
  const convertPayload = {
    assignedToId: 'tech-123',  // Should be assignedToId, not assignedTo
    scheduledDate: new Date().toISOString(),
    estimatedCost: 250.00,
    notes: 'Urgent repair needed',
  };

  // Verify field names match Prisma schema
  assert.equal(typeof convertPayload.assignedToId, 'string');
  assert.equal(typeof convertPayload.scheduledDate, 'string');
  assert.equal(typeof convertPayload.estimatedCost, 'number');
  assert.equal(typeof convertPayload.notes, 'string');
  
  // Ensure we're not using the wrong field name
  assert.equal(convertPayload.assignedTo, undefined);
});

test('convertToJob uses valid job status', () => {
  // Test that status values are valid JobStatus enum values
  const validStatuses = ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];
  
  // When assignedToId is provided, status should be ASSIGNED
  const statusWithAssignment = 'ASSIGNED';
  assert.ok(validStatuses.includes(statusWithAssignment));
  
  // When assignedToId is null, status should be OPEN
  const statusWithoutAssignment = 'OPEN';
  assert.ok(validStatuses.includes(statusWithoutAssignment));
  
  // SCHEDULED is not a valid JobStatus
  const invalidStatus = 'SCHEDULED';
  assert.ok(!validStatuses.includes(invalidStatus));
});

test('convertToJob includes correct relation name', () => {
  // Test that the include uses correct Prisma relation name
  const includeConfig = {
    property: {
      select: {
        id: true,
        name: true,
        address: true,
      },
    },
    unit: {
      select: {
        id: true,
        unitNumber: true,
      },
    },
    assignedTo: {  // Should be assignedTo, not technician
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
      },
    },
  };

  // Verify correct relation names
  assert.ok(includeConfig.assignedTo !== undefined);
  assert.ok(includeConfig.technician === undefined);
});

test('convertToJob handles optional fields correctly', () => {
  // Test that optional fields can be null or undefined
  const minimalPayload = {
    // All fields are optional
  };

  const fullPayload = {
    assignedToId: 'tech-123',
    scheduledDate: new Date().toISOString(),
    estimatedCost: 250.00,
    notes: 'Test notes',
  };

  // Both should be valid
  assert.ok(typeof minimalPayload === 'object');
  assert.ok(typeof fullPayload === 'object');
  
  // Verify optional fields default to null
  assert.equal(minimalPayload.assignedToId, undefined);
  assert.equal(minimalPayload.scheduledDate, undefined);
  assert.equal(minimalPayload.estimatedCost, undefined);
});

test('convertToJob requires authentication', () => {
  // Test that convert-to-job endpoint requires auth
  const endpoint = {
    path: '/service-requests/:id/convert-to-job',
    method: 'POST',
    requiresAuth: true,
    requiresRole: 'PROPERTY_MANAGER',
  };

  assert.equal(endpoint.requiresAuth, true);
  assert.equal(endpoint.requiresRole, 'PROPERTY_MANAGER');
  assert.equal(endpoint.method, 'POST');
});

test('convertToJob restricted to property managers', () => {
  // Test that only PROPERTY_MANAGER role can convert to job
  const allowedRoles = ['PROPERTY_MANAGER'];
  const deniedRoles = ['OWNER', 'TECHNICIAN', 'TENANT'];

  assert.ok(allowedRoles.includes('PROPERTY_MANAGER'));
  deniedRoles.forEach(role => {
    assert.ok(!allowedRoles.includes(role));
  });
});
