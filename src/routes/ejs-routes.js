import { Router } from 'express';
import { homePage, aboutPage, testErrorPage } from './index.js';
import { trainsPage } from './trains.js';
import tripsPageRouter from './trips.js';

import { bookingsAdminPage } from '../controllers/bookings.js';
import { tripsAdminPage } from '../controllers/trips.js';
import { getUsersPage } from '../controllers/users.js';
import { requirePageLogin, requirePageRole } from '../middleware/auth.js';

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

// Admin Dashboard - admin access only
router.get('/admin', requirePageRole('admin'), (req, res) => {
    res.render('admin-dashboard', {
        title: 'Admin Dashboard | Kizuna Rail'
    });
});

// User dashboard - available to signed-in users
router.get('/dashboard', requirePageLogin, (req, res) => {
    res.render('dashboard', {
        title: 'Dashboard | Kizuna Rail'
    });
});

// Trains page
router.get('/trains', trainsPage);

// Ticket Class Comparison practice page
router.get('/ticket-class-comparison', (req, res) => {
    res.render('ticket-class-comparison', {
        title: 'Compare Ticket Classes | Kizuna Rail'
    });
});
/*
 * PLAIN ENGLISH: The web address for the Bookings Admin page. Anyone who is
 *   logged in can open it. Logged-out visitors are sent to the login page.
 * LOGIC: When someone opens /bookings-admin, requirePageLogin runs first.
 *   If there is no logged-in user, it redirects to /login. If there is,
 *   Express calls bookingsAdminPage, which shows src/views/bookings.ejs.
 * WHY WE NEED IT: The Bookings feature (issue #16) created this page.
 *   Feature Set 4 (issue #19) says admins see all bookings and normal users
 *   see only bookings where they are a passenger, so the page must open
 *   for every logged-in user, not only admins.
 * LEARNING GAP: Feature Set 1 first locked this page with
 *   requirePageRole('admin'), which blocked normal users completely.
 *   requirePageLogin only asks "are you logged in?" The question "which
 *   bookings can you see?" is answered later by the controller behind
 *   /api/bookings. This route is not inside /trips because the assignment
 *   asks for /bookings-admin on its own, next to pages like /trains.
 */
// Bookings Admin page
router.get('/bookings-admin', requirePageLogin, bookingsAdminPage);

// Protected Trip Admin page - admin access only
router.get('/trips-admin', requirePageRole('admin'), tripsAdminPage);

// User Management page
router.get('/admin/users', requirePageLogin, getUsersPage);

// Rail trips, bookings, and confirmations
router.use('/trips', tripsPageRouter);

// Test 500 error page
router.get('/500', testErrorPage);

export default router;