import { Router } from 'express';

// Existing imports
import authRouter from './auth.js';
import jobsRouter from './jobs.js';
import unitsRouter from './units.js';
import propertiesRouter from './properties.js';
import dashboardRouter from './dashboard.js';
import inspectionsRouter from './inspections.js';

// Missing imports based on the image
import billingRouter from './billing.js';
import invitesRouter from './invites.js';
import maintenanceRouter from './maintenance.js';
import plansRouter from './plans.js';
import recommendationsRouter from './recommendations.js';
import reportsRouter from './reports.js';
import serviceRequestsRouter from './serviceRequests.js';
import subscriptionsRouter from './subscriptions.js';
import tenantsRouter from './tenants.js';
import uploadsRouter from './uploads.js';
import usersRouter from './users.js';
// Note: 'routes.js' is likely an error or a duplicate and is not imported.
// 'auth.js.backup' is ignored.

const router = Router();

// Existing routes
router.use('/auth', authRouter);
router.use('/jobs', jobsRouter);
router.use('/units', unitsRouter);
router.use('/properties/:propertyId/units', unitsRouter);
router.use('/properties', propertiesRouter);
router.use('/dashboard', dashboardRouter);
router.use('/inspections', inspectionsRouter);

// Add missing routes
router.use('/billing', billingRouter);
router.use('/invites', invitesRouter);
router.use('/maintenance', maintenanceRouter);
router.use('/plans', plansRouter);
router.use('/recommendations', recommendationsRouter);
router.use('/reports', reportsRouter);
router.use('/serviceRequests', serviceRequestsRouter);
router.use('/subscriptions', subscriptionsRouter);
router.use('/tenants', tenantsRouter);
router.use('/uploads', uploadsRouter);
router.use('/users', usersRouter);

// Health check
router.get('/health', (_req, res) => res.json({ ok: true }));

export default router;