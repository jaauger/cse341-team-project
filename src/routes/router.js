import { Router } from 'express';

import ejsRouter from './ejs-routes.js';
import apiRouter from './api-routes.js';

const router = Router();

// Routes that render EJS pages
router.use('/', ejsRouter);

// Routes that return JSON data
router.use('/api', apiRouter);

export default router;