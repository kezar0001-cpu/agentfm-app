import { Router } from 'express';
import authRouter from './auth.js';
import jobsRouter from './jobs.js';
import unitsRouter from './units.js';
import propertiesRouter from './properties.js';

const router = Router();

router.use('/auth', authRouter);
router.use('/jobs', jobsRouter);
router.use('/properties/:propertyId/units', unitsRouter);
router.use('/properties', propertiesRouter);


router.get('/health', (_req, res) => res.json({ ok: true }));

export default router;
