import test from 'node:test';
import assert from 'node:assert/strict';

import propertiesRouter from '../src/routes/properties.js';

test('property list select includes job and inspection counts', () => {
  const { propertyListSelect } = propertiesRouter._test;
  assert.ok(propertyListSelect, 'Expected propertyListSelect to be exposed for tests');
  const countSelect = propertyListSelect?._count?.select;
  assert.ok(countSelect, 'Expected _count.select to be defined');
  assert.equal(countSelect.units, true);
  assert.equal(countSelect.jobs, true);
  assert.equal(countSelect.inspections, true);
});
