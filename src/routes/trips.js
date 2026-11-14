import { bookingPage, processBookingRequest } from './book.js';
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