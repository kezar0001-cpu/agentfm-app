import test from 'node:test';
import assert from 'node:assert/strict';

import inspectionsRouter from '../src/routes/inspections.js';

const { buildInspectionWhere, buildAccessWhere, parseSort } = inspectionsRouter._test;

test('buildInspectionWhere returns an empty filter object when no params provided', () => {
  const where = buildInspectionWhere({}, { role: 'ADMIN' });
  assert.deepEqual(where, {});
});

test('buildInspectionWhere ignores invalid status filters and builds AND clauses safely', () => {
  const where = buildInspectionWhere(
    {
      status: 'invalid,scheduled',
      dateFrom: '2024-01-01',
      dateTo: 'not-a-date',
      tag: 'fire',
      tags: 'safety,annual',
    },
    { role: 'ADMIN' },
  );

  assert.ok(Array.isArray(where.AND));
  const statusFilter = where.AND.find((clause) => clause.status);
  assert.deepEqual(statusFilter, { status: { in: ['SCHEDULED'] } });
  const tagFilter = where.AND.find((clause) => clause.tags);
  assert.deepEqual(tagFilter, { tags: { hasEvery: ['fire', 'safety', 'annual'] } });
  const dateFilter = where.AND.find((clause) => clause.scheduledDate);
  assert.deepEqual(Object.keys(dateFilter.scheduledDate), ['gte']);
});

test('buildAccessWhere provides isolation by role when user lacks assigned entities', () => {
  assert.equal(buildAccessWhere(undefined), undefined);
  assert.equal(buildAccessWhere({ role: 'ADMIN' }), undefined);
  assert.deepEqual(buildAccessWhere({ role: 'PROPERTY_MANAGER', managedPropertyIds: [] }), {
    propertyId: { in: ['__none__'] },
  });
  assert.deepEqual(buildAccessWhere({ role: 'OWNER', ownedPropertyIds: [] }), {
    propertyId: { in: ['__none__'] },
  });
  assert.deepEqual(buildAccessWhere({ role: 'TENANT', tenantUnitIds: [] }), {
    unitId: { in: ['__none__'] },
  });
  assert.deepEqual(buildAccessWhere({ role: 'TECHNICIAN', id: 'tech-1' }), {
    assignedToId: 'tech-1',
  });
});

test('parseSort defaults to scheduledDate ascending when unknown sort field provided', () => {
  assert.deepEqual(parseSort('unknown', 'desc'), { scheduledDate: 'asc' });
  assert.deepEqual(parseSort('status', 'desc'), { status: 'desc' });
});
