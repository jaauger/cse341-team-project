import { Router } from 'express';

import { trainsApi } from './trains.js';
import {
    getAllTicketClasses,
    getTicketClassesForDay
} from '../controllers/ticket-classes.js';

import {
    getSchedulesForTrip,
    getSchedulesForTripAndMonth
} from '../controllers/schedules.js';

import { getAllTrips, getTripById } from '../controllers/trips.js';

import { getAllStations, getStationById } from '../controllers/stations.js';

import {
    getAllBookings,
    updateBooking,
    deleteBooking
} from '../controllers/bookings.js';

import { requireApiLogin } from '../middleware/auth.js';

const router = Router();


/**
 * @openapi
 * /trains:
 *   get:
 *     summary: Get all trains
 *     description: Returns the available trains in the Kizuna Rail database.
 *     tags:
 *       - Trains
 *     responses:
 *       '200':
 *         description: Successfully retrieved train data.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *       '500':
 *         description: Internal server error.
 */
// Trains API
router.get('/trains', trainsApi);

/**
 * @openapi
 * /ticket-classes:
 *   get:
 *     summary: Get ticket classes
 *     description: Returns all ticket classes. When the optional day query parameter is included, returns only the ticket classes offered on that day.
 *     tags:
 *       - Ticket Classes
 *     parameters:
 *       - in: query
 *         name: day
 *         required: false
 *         schema:
 *           type: string
 *         description: A day name from monday to sunday. Upper or lower case is accepted. Leave empty to get all ticket classes.
 *     responses:
 *       '200':
 *         description: Successfully retrieved ticket classes. The list can be empty.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   class:
 *                     type: string
 *                   name:
 *                     type: string
 *                   pricePerKm:
 *                     type: number
 *                   amenities:
 *                     type: array
 *                     items:
 *                       type: string
 *                   description:
 *                     type: string
 *                   daysOfWeek:
 *                     type: array
 *                     items:
 *                       type: string
 *       '400':
 *         description: The day is not a valid day name.
 *       '500':
 *         description: Internal server error.
 */
/*
 * PLAIN ENGLISH: This is the address the booking page calls to ask which
 *   ticket classes exist, or which ones are offered on a certain day.
 * LOGIC: One address handles both questions. If the request includes a day
 *   (?day=tuesday), it is passed to getTicketClassesForDay. If there is no
 *   day, it is passed to getAllTicketClasses.
 * WHY WE NEED IT: The assignment asks for /api/ticket-classes and
 *   /api/ticket-classes?day={day}. The part after the question mark is not
 *   part of the address, so both arrive at this same route.
 * LEARNING GAP: This file only writes '/ticket-classes'. The '/api' in front
 *   is added by src/routes/router.js. The data itself comes from the
 *   controller, which gets it from the model and the ticketClasses
 *   collection.
 */
// Ticket Classes API
router.get('/ticket-classes', (req, res) => {
    if (req.query.day !== undefined) {
        return getTicketClassesForDay(req, res);
    }

    return getAllTicketClasses(req, res);
});



/**
 * @openapi
 * /trips/{id}/schedules:
 *   get:
 *     summary: Get schedules for a trip
 *     description: Returns schedules for a trip, optionally filtered by month.
 *     tags:
 *       - Schedules
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The unique trip ID.
 *       - in: query
 *         name: month
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 12
 *         description: Optional month number used to filter schedules.
 *     responses:
 *       '200':
 *         description: Successfully retrieved schedules. The array may be empty.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *       '400':
 *         description: Invalid month parameter.
 *       '500':
 *         description: Internal server error.
 */
router.get('/trips/:id/schedules', (req, res) => {
    if (req.query.month !== undefined) {
        return getSchedulesForTripAndMonth(req, res);
    }

    return getSchedulesForTrip(req, res);
});


/**
 * @openapi
 * /trips:
 *   get:
 *     summary: Get all trips
 *     description: Returns the available trips in the Kizuna Rail database.
 *     tags:
 *       - Trips
 *     responses:
 *       '200':
 *         description: Successfully retrieved trip data.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *       '500':
 *         description: Internal server error.
 */
router.get('/trips', getAllTrips);

/**
 * @openapi
 * /trips/{id}:
 *   get:
 *     summary: Get a trip by ID
 *     description: Returns a specific trip from the Kizuna Rail database.
 *     tags:
 *       - Trips
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       '200':
 *         description: Successfully retrieved trip data.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       '404':
 *         description: Trip not found.
 *       '500':
 *         description: Internal server error.
 */
router.get('/trips/:id', getTripById);


/**
 * @openapi
 * /stations:
 *   get:
 *     summary: Get all stations
 *     tags:
 *       - Stations
 *     responses:
 *       '200':
 *         description: A list of stations
 *       '500':
 *         description: Internal server error
 */
router.get('/stations', getAllStations);

/**
 * @openapi
 * /stations/{id}:
 *   get:
 *     summary: Get one station by ID
 *     tags:
 *       - Stations
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The station ID
 *     responses:
 *       '200':
 *         description: Station returned successfully
 *       '404':
 *         description: Station not found
 *       '500':
 *         description: Internal server error
 */
router.get('/stations/:id', getStationById);

/**
 * @openapi
 * /bookings:
 *   get:
 *     summary: Get bookings for the logged-in user
 *     description: Requires login. Admins get every booking. Other users get only the bookings where their email matches one of the passengers (capital letters do not matter). Newest first. The Bookings Admin page uses this to fill in its list.
 *     tags:
 *       - Bookings
 *     responses:
 *       '200':
 *         description: Successfully retrieved bookings. The list can be empty.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                     description: The confirmation code.
 *                   scheduleId:
 *                     type: number
 *                   tripId:
 *                     type: string
 *                   ticketClass:
 *                     type: string
 *                   selectedDay:
 *                     type: string
 *                   passengers:
 *                     type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         firstName:
 *                           type: string
 *                         lastName:
 *                           type: string
 *                         email:
 *                           type: string
 *                         phone:
 *                           type: string
 *                   createdAt:
 *                     type: string
 *                     format: date-time
 *                   updatedAt:
 *                     type: string
 *                     format: date-time
 *       '401':
 *         description: Not logged in.
 *       '500':
 *         description: Internal server error.
 */
/*
 * PLAIN ENGLISH: This is the address the Bookings Admin page calls to get
 *   the list of bookings for whoever is logged in.
 * LOGIC: requireApiLogin runs first and sends 401 JSON if nobody is logged
 *   in. Otherwise, the request goes to the getAllBookings controller, which
 *   sends all bookings to an admin and only matching bookings to everyone
 *   else.
 * WHY WE NEED IT: The Bookings feature (issue #16) created /api/bookings.
 *   Feature Set 4 (issue #19) changed who can use it: every logged-in user,
 *   each seeing the right list.
 * LEARNING GAP: Feature Set 1 first used requireApiRole('admin') here, which
 *   blocked normal users with 403. requireApiLogin only checks "logged in?"
 *   and the controller decides which bookings to send.
 *   This file only writes '/bookings'. The '/api' in front is added by
 *   src/routes/router.js. The Swagger notes above are what make this route
 *   show up at /api-docs.
 * DATA COMES FROM: getAllBookings in src/controllers/bookings.js, which gets
 *   the list from the model and the "bookings" collection.
 */
// Bookings API
router.get('/bookings', requireApiLogin, getAllBookings);

/**
 * @openapi
 * /bookings/{id}:
 *   put:
 *     summary: Update a booking
 *     description: Requires login. Admins can update any booking. Other users can update only bookings where they are a passenger. Only ticketClass, selectedDay, and passengers can be changed.
 *     tags:
 *       - Bookings
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The booking confirmation code, like KR-AB12CD.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - ticketClass
 *               - selectedDay
 *               - passengers
 *             properties:
 *               ticketClass:
 *                 type: string
 *                 description: Must match an existing ticket class code.
 *                 example: standard
 *               selectedDay:
 *                 type: string
 *                 description: A day name from monday to sunday.
 *                 example: tuesday
 *               passengers:
 *                 type: array
 *                 minItems: 1
 *                 items:
 *                   type: object
 *                   required:
 *                     - firstName
 *                     - lastName
 *                     - email
 *                   properties:
 *                     firstName:
 *                       type: string
 *                       example: Sina
 *                     lastName:
 *                       type: string
 *                       example: McBraun
 *                     email:
 *                       type: string
 *                       example: sina@example.com
 *                     phone:
 *                       type: string
 *                       example: 808-555-0100
 *     responses:
 *       '200':
 *         description: Booking updated. Returns the updated booking.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       '400':
 *         description: Missing or invalid fields.
 *       '401':
 *         description: Not logged in.
 *       '403':
 *         description: Logged in, but not a passenger on this booking and not an admin.
 *       '404':
 *         description: No booking with that id.
 *       '500':
 *         description: Internal server error.
 *   delete:
 *     summary: Delete a booking
 *     description: Requires login. Admins can delete any booking. Other users can delete only bookings where they are a passenger.
 *     tags:
 *       - Bookings
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The booking confirmation code, like KR-AB12CD.
 *     responses:
 *       '204':
 *         description: Booking deleted. No content is returned.
 *       '401':
 *         description: Not logged in.
 *       '403':
 *         description: Logged in, but not a passenger on this booking and not an admin.
 *       '404':
 *         description: No booking with that id.
 *       '500':
 *         description: Internal server error.
 */
/*
 * PLAIN ENGLISH: The addresses for editing and deleting one booking.
 * LOGIC: Both use the booking's confirmation code in the URL (:id).
 *   requireApiLogin runs first and sends 401 if nobody is logged in.
 *   Then updateBooking or deleteBooking checks that the booking exists
 *   (404) and that the user is an admin or a passenger (403).
 * WHY WE NEED IT: Feature Set 4 (issue #19) asks for the ability to update
 *   and delete bookings through the API, secured for passengers and admins.
 * LEARNING GAP: PUT means "replace these fields with new values" and DELETE
 *   means "remove this one." The same address (/bookings/:id) does two
 *   different jobs depending on the method. One Swagger block can describe
 *   both because they share the same path.
 * DATA COMES FROM: req.params.id (the code in the URL), req.body (the edit
 *   form, for PUT), and req.user (the login session).
 */
router.put('/bookings/:id', requireApiLogin, updateBooking);
router.delete('/bookings/:id', requireApiLogin, deleteBooking);

export default router;
