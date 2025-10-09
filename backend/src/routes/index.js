import { Router } from 'express';
import auth from './auth.js';
// import other routers here (properties, units, etc.)

const router = Router();

router.use('/', auth);
// router.use('/properties', propertiesRouter); // example

export default router;
