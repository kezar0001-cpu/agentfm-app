import { Router } from 'express';
import authRouter from './auth.js';
import jobsRouter from './jobs.js';
import unitsRouter from './units.js';
import propertiesRouter from './properties.js';
import dashboardRouter from './dashboard.js'; // ✅ ADD THIS

const router = Router();

router.use('/auth', authRouter);
router.use('/jobs', jobsRouter);
router.use('/units', unitsRouter);
router.use('/properties/:propertyId/units', unitsRouter);
router.use('/properties', propertiesRouter);
router.use('/dashboard', dashboardRouter); // ✅ ADD THIS LINE

router.get('/health', (_req, res) => res.json({ ok: true }));

export default router;
