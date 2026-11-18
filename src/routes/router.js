import { Router } from 'express';

import ejsRouter from './ejs-routes.js';
import apiRouter from './api-routes.js';
import authRouter from './auth-routes.js';


const router = Router();

// Routes that render EJS pages
router.use('/', ejsRouter);

// Authentication API routes
router.use('/api/auth', authRouter);

// Routes that return JSON data
router.use('/api', apiRouter);

export default router;