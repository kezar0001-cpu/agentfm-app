import { Router } from 'express';
import authRouter from './auth.js';

const router = Router();

router.use('/auth', authRouter);

router.get('/health', (_req, res) => res.json({ ok: true }));

export default router;
