/*
 * PLAIN ENGLISH: Bring in the two booking page functions from their new home.
 * LOGIC: bookingPage and processBookingRequest now live in
 *   src/controllers/bookings.js instead of src/routes/book.js.
 * WHY WE NEED IT: The Bookings feature (issue #16) asks us to move these two
 *   functions into the bookings controller so routes only connect web
 *   addresses to controller functions.
 * LEARNING GAP: The web addresses below did NOT change. Only the file the
 *   functions come from changed, so the booking form and the thank-you page
 *   work exactly as before.
 */
import { bookingPage, processBookingRequest } from '../controllers/bookings.js';
import confirmationPage from './confirm.js';
import { getTripDetailsPage, getTripsListPage } from '../controllers/trips.js';
import { Router } from 'express';

const router = Router();

// List all trips
router.get('/', getTripsListPage);

// Trip details page
router.get('/:tripId', getTripDetailsPage);

// Book ticket
router.get('/booking/:scheduleId', bookingPage);
router.post('/book', processBookingRequest);

// Booking confirmation page
router.get('/confirmation/:confirmationId', confirmationPage);

export default router;

// const tripsPage = async (req, res) => {
//     const db = getDb();
//     const [regions, trips, seasons] = await Promise.all([
//         db.collection('trips').distinct('region'),
//         db.collection('trips').find({}).toArray(),
//         db.collection('trips').distinct('bestSeason')
//     ]);

//     res.render('trips/list', {
//         title: 'Scenic Train Trips',
//         regions,
//         trips,
//         seasons
//     });
// }

// export { tripsPage };
