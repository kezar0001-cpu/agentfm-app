// Test to verify ES module imports work correctly
import { describe, it } from 'node:test';
import assert from 'node:assert';

describe('ES Module Imports', () => {
  it('should import session utilities', async () => {
    const { setSessionCookie, readSession, clearSession } = await import('../src/utils/session.js');
    assert.ok(typeof setSessionCookie === 'function');
    assert.ok(typeof readSession === 'function');
    assert.ok(typeof clearSession === 'function');
  });

  it('should import PCI utilities', async () => {
    const { computePCI, applyRules } = await import('../src/utils/pci.js');
    assert.ok(typeof computePCI === 'function');
    assert.ok(typeof applyRules === 'function');
  });

  it('should import validate middleware', async () => {
    const validateModule = await import('../src/middleware/validate.js');
    assert.ok(typeof validateModule.default === 'function');
  });

  it('should import memoryStore', async () => {
    const memoryStore = await import('../src/data/memoryStore.js');
    assert.ok(typeof memoryStore.listProperties === 'function');
    assert.ok(typeof memoryStore.addProperty === 'function');
    assert.ok(typeof memoryStore.getDashboardSummary === 'function');
  });

  it('should import route modules', async () => {
    const subscriptionsRouter = await import('../src/routes/subscriptions.js');
    const reportsRouter = await import('../src/routes/reports.js');
    const plansRouter = await import('../src/routes/plans.js');
    const recommendationsRouter = await import('../src/routes/recommendations.js');
    const serviceRequestsRouter = await import('../src/routes/serviceRequests.js');
    const dashboardRouter = await import('../src/routes/dashboard.js');
    const inspectionsRouter = await import('../src/routes/inspections.js');
    const jobsRouter = await import('../src/routes/jobs.js');
    const unitsRouter = await import('../src/routes/units.js');
    const uploadsRouter = await import('../src/routes/uploads.js');

    assert.ok(subscriptionsRouter.default);
    assert.ok(reportsRouter.default);
    assert.ok(plansRouter.default);
    assert.ok(recommendationsRouter.default);
    assert.ok(serviceRequestsRouter.default);
    assert.ok(dashboardRouter.default);
    assert.ok(inspectionsRouter.default);
    assert.ok(jobsRouter.default);
    assert.ok(unitsRouter.default);
    assert.ok(uploadsRouter.default);
  });

  it('should compute PCI correctly', async () => {
    const { computePCI } = await import('../src/utils/pci.js');
    
    // Test with no findings
    assert.strictEqual(computePCI([]), 100);
    assert.strictEqual(computePCI(null), 100);
    
    // Test with findings
    const findings = [
      { severity: 'LOW' },
      { severity: 'MEDIUM' },
      { severity: 'HIGH' }
    ];
    const pci = computePCI(findings);
    assert.ok(typeof pci === 'number');
    assert.ok(pci >= 0 && pci <= 100);
  });
});
