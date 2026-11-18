import { Router } from 'express';

import { homePage, aboutPage, testErrorPage } from './index.js';
import { trainsPage } from './trains.js';
import tripsPageRouter from './trips.js';
import { bookingsAdminPage } from '../controllers/bookings.js';
import { requirePageRole } from '../middleware/auth.js';

const router = Router();

// Home page
router.get('/', homePage);

// About page
router.get('/about', aboutPage);

// Login page
router.get('/login', (req, res) => {
    res.render('login', {
        title: 'Login | Kizuna Rail'
    });
});

// Registration page
router.get('/register', (req, res) => {
    res.render('register', {
        title: 'Register | Kizuna Rail'
    });
});

// Trains page
router.get('/trains', trainsPage);

/*
 * PLAIN ENGLISH: The web address for the new Bookings Admin page.
 * LOGIC: When someone opens /bookings-admin, Express calls
 *   bookingsAdminPage, which shows the src/views/bookings.ejs page.
 * WHY WE NEED IT: The Bookings feature (issue #16) asks for an EJS route
 *   that maps to /bookings-admin.
 * LEARNING GAP: This route only opens the page. The list of bookings is
 *   filled in afterward by JavaScript calling /api/bookings. This route is
 *   not inside /trips because the assignment asks for /bookings-admin on
 *   its own, next to pages like /trains.
 */
// Bookings Admin page
router.get('/bookings-admin', requirePageRole('admin'), bookingsAdminPage);

// Rail trips, bookings, and confirmations
router.use('/trips', tripsPageRouter);

// Test 500 error page
router.get('/500', testErrorPage);

export default router;
