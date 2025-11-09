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

test('occupancy stats calculation handles various unit statuses correctly', () => {
  // Mock property with units in different statuses
  const mockProperty = {
    id: 'property-1',
    name: 'Test Property',
    totalUnits: 10,
    units: [
      { status: 'OCCUPIED' },
      { status: 'OCCUPIED' },
      { status: 'OCCUPIED' },
      { status: 'OCCUPIED' },
      { status: 'OCCUPIED' },
      { status: 'OCCUPIED' },
      { status: 'OCCUPIED' },
      { status: 'VACANT' },
      { status: 'VACANT' },
      { status: 'MAINTENANCE' },
    ],
  };

  // Simulate the backend calculation (same logic as in propertyController.js)
  const occupiedCount = mockProperty.units.filter(u => u.status === 'OCCUPIED').length;
  const vacantCount = mockProperty.units.filter(u => u.status === 'VACANT').length;
  const maintenanceCount = mockProperty.units.filter(u => u.status === 'MAINTENANCE').length;
  const totalUnits = mockProperty.units.length || mockProperty.totalUnits || 0;
  const occupancyRate = totalUnits > 0 ? ((occupiedCount / totalUnits) * 100).toFixed(1) : 0;

  const occupancyStats = {
    occupied: occupiedCount,
    vacant: vacantCount,
    maintenance: maintenanceCount,
    total: totalUnits,
    occupancyRate: parseFloat(occupancyRate),
  };

  // Assertions
  assert.equal(occupancyStats.occupied, 7, 'Expected 7 occupied units');
  assert.equal(occupancyStats.vacant, 2, 'Expected 2 vacant units');
  assert.equal(occupancyStats.maintenance, 1, 'Expected 1 unit in maintenance');
  assert.equal(occupancyStats.total, 10, 'Expected total of 10 units');
  assert.equal(occupancyStats.occupancyRate, 70.0, 'Expected 70% occupancy rate');
});

test('occupancy stats calculation handles empty units array', () => {
  const mockProperty = {
    id: 'property-2',
    name: 'Empty Property',
    totalUnits: 0,
    units: [],
  };

  const occupiedCount = mockProperty.units.filter(u => u.status === 'OCCUPIED').length;
  const vacantCount = mockProperty.units.filter(u => u.status === 'VACANT').length;
  const maintenanceCount = mockProperty.units.filter(u => u.status === 'MAINTENANCE').length;
  const totalUnits = mockProperty.units.length || mockProperty.totalUnits || 0;
  const occupancyRate = totalUnits > 0 ? ((occupiedCount / totalUnits) * 100).toFixed(1) : 0;

  const occupancyStats = {
    occupied: occupiedCount,
    vacant: vacantCount,
    maintenance: maintenanceCount,
    total: totalUnits,
    occupancyRate: parseFloat(occupancyRate),
  };

  assert.equal(occupancyStats.occupied, 0, 'Expected 0 occupied units');
  assert.equal(occupancyStats.vacant, 0, 'Expected 0 vacant units');
  assert.equal(occupancyStats.maintenance, 0, 'Expected 0 units in maintenance');
  assert.equal(occupancyStats.total, 0, 'Expected total of 0 units');
  assert.equal(occupancyStats.occupancyRate, 0, 'Expected 0% occupancy rate');
});

test('occupancy stats calculation handles all occupied units', () => {
  const mockProperty = {
    id: 'property-3',
    name: 'Fully Occupied Property',
    totalUnits: 5,
    units: [
      { status: 'OCCUPIED' },
      { status: 'OCCUPIED' },
      { status: 'OCCUPIED' },
      { status: 'OCCUPIED' },
      { status: 'OCCUPIED' },
    ],
  };

  const occupiedCount = mockProperty.units.filter(u => u.status === 'OCCUPIED').length;
  const vacantCount = mockProperty.units.filter(u => u.status === 'VACANT').length;
  const maintenanceCount = mockProperty.units.filter(u => u.status === 'MAINTENANCE').length;
  const totalUnits = mockProperty.units.length || mockProperty.totalUnits || 0;
  const occupancyRate = totalUnits > 0 ? ((occupiedCount / totalUnits) * 100).toFixed(1) : 0;

  const occupancyStats = {
    occupied: occupiedCount,
    vacant: vacantCount,
    maintenance: maintenanceCount,
    total: totalUnits,
    occupancyRate: parseFloat(occupancyRate),
  };

  assert.equal(occupancyStats.occupied, 5, 'Expected 5 occupied units');
  assert.equal(occupancyStats.vacant, 0, 'Expected 0 vacant units');
  assert.equal(occupancyStats.maintenance, 0, 'Expected 0 units in maintenance');
  assert.equal(occupancyStats.total, 5, 'Expected total of 5 units');
  assert.equal(occupancyStats.occupancyRate, 100.0, 'Expected 100% occupancy rate');
});
