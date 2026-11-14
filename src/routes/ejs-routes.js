import { Router } from 'express';

import { homePage, aboutPage, testErrorPage } from './index.js';
import { trainsPage } from './trains.js';
import tripsPageRouter from './trips.js';

const router = Router();

// Home page
router.get('/', homePage);

// About page
router.get('/about', aboutPage);

// Trains page
router.get('/trains', trainsPage);

// Rail trips, bookings, and confirmations
router.use('/trips', tripsPageRouter);

// Test 500 error page
router.get('/500', testErrorPage);

export default router;