import { Router } from 'express';

import { trainsApi } from './trains.js';
import {
    getAllTicketClasses,
    getTicketClassesForDay,
    getTicketClassesComparison
} from '../controllers/ticket-classes.js';

import {
    getAllSchedules,
    getSchedulesForTrip,
    getSchedulesForTripAndMonth
} from '../controllers/schedules.js';

import {
    getAllTrips,
    getTripById,
    updateTrip,
    deleteTrip
} from '../controllers/trips.js';

import { getAllStations, getStationById } from '../controllers/stations.js';

import {
    getAllBookings,
    updateBooking,
    deleteBooking
} from '../controllers/bookings.js';

import {
    getUsers,
    updateUserRole,
    deleteUser
} from '../controllers/users.js';

import {
    requireApiLogin,
    requireApiRole
} from '../middleware/auth.js';

const router = Router();

/**
 * @openapi
 * /trains:
 *   get:
 *     summary: Get a paginated list of trains
 *     description: Returns available trains in the Kizuna Rail database, sorted alphabetically by name.
 *     tags:
 *       - Trains
 *     parameters:
 *       - in: query
 *         name: page
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: The page number to retrieve.
 *       - in: query
 *         name: limit
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: The maximum number of trains returned per page.
 *     responses:
 *       '200':
 *         description: Successfully retrieved train data. Pages beyond the available records return an empty trains array.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 trains:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                       id:
 *                         type: string
 *                       name:
 *                         type: string
 *                       operator:
 *                         type: string
 *                       imageUrl:
 *                         type: string
 *                       imageAlt:
 *                         type: string
 *                       type:
 *                         type: string
 *                       maxSpeedKmh:
 *                         type: integer
 *                       capacity:
 *                         type: integer
 *                       powerSource:
 *                         type: string
 *                       bestFor:
 *                         type: string
 *                       description:
 *                         type: string
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     totalItems:
 *                       type: integer
 *                       example: 14
 *                     totalPages:
 *                       type: integer
 *                       example: 2
 *                     currentPage:
 *                       type: integer
 *                       example: 1
 *                     itemsPerPage:
 *                       type: integer
 *                       example: 10
 *                     hasNextPage:
 *                       type: boolean
 *                       example: true
 *                     hasPreviousPage:
 *                       type: boolean
 *                       example: false
 *       '400':
 *         description: Invalid pagination parameters.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Page and limit must be positive integers.
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
// Ticket Classes API
router.get('/ticket-classes', (req, res) => {
    if (req.query.day !== undefined) {
        return getTicketClassesForDay(req, res);
    }

    return getAllTicketClasses(req, res);
});

/**
 * @openapi
 * /ticket-classes/compare:
 *   get:
 *     summary: Compare ticket classes for two travel days
 *     tags:
 *       - Ticket Classes
 *     parameters:
 *       - in: query
 *         name: day1
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: day2
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       '200':
 *         description: Ticket classes for both days.
 *       '400':
 *         description: Invalid or missing day.
 *       '500':
 *         description: Internal server error.
 */
router.get('/ticket-classes/compare', getTicketClassesComparison);

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
 * /schedules:
 *   get:
 *     summary: Get all schedules
 *     description: Returns all schedules in the Kizuna Rail database.
 *     tags:
 *       - Schedules
 *     responses:
 *       '200':
 *         description: Successfully retrieved schedules.
 *       '500':
 *         description: Internal server error.
 */
router.get('/schedules', getAllSchedules);

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
 *   put:
 *     summary: Update a trip (Admin only)
 *     description: Requires admin role. Updates trip details and optionally reassigns existing schedules to this trip.
 *     tags:
 *       - Trips
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The unique trip ID.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - startStation
 *               - endStation
 *               - region
 *               - duration
 *               - distance
 *             properties:
 *               name:
 *                 type: string
 *               startStation:
 *                 type: string
 *               endStation:
 *                 type: string
 *               region:
 *                 type: string
 *               duration:
 *                 type: string
 *               distance:
 *                 type: number
 *               operatingMonths:
 *                 type: array
 *                 items:
 *                   type: integer
 *               bestSeason:
 *                 type: string
 *               description:
 *                 type: string
 *               scheduleIds:
 *                 type: array
 *                 items:
 *                   type: integer
 *     responses:
 *       '200':
 *         description: Trip updated successfully.
 *       '400':
 *         description: Missing or invalid trip fields.
 *       '401':
 *         description: Authentication required.
 *       '403':
 *         description: Forbidden - admin role required.
 *       '404':
 *         description: Trip not found.
 *       '500':
 *         description: Internal server error.
 *   delete:
 *     summary: Delete a trip (Admin only)
 *     description: Requires admin role. Deletes a trip from the database.
 *     tags:
 *       - Trips
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The unique trip ID.
 *     responses:
 *       '204':
 *         description: Trip deleted successfully.
 *       '401':
 *         description: Authentication required.
 *       '403':
 *         description: Forbidden - admin role required.
 *       '404':
 *         description: Trip not found.
 *       '500':
 *         description: Internal server error.
 */
router.get('/trips/:id', getTripById);
router.put('/trips/:id', requireApiRole('admin'), updateTrip);
router.delete('/trips/:id', requireApiRole('admin'), deleteTrip);

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
router.put('/bookings/:id', requireApiLogin, updateBooking);
router.delete('/bookings/:id', requireApiLogin, deleteBooking);

/**
 * @openapi
 * /users:
 *   get:
 *     summary: Get the authenticated user's account or all users
 *     description: Administrators receive all users. Normal users receive only their own account.
 *     tags:
 *       - Users
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       '200':
 *         description: Successfully retrieved user data.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                   displayName:
 *                     type: string
 *                   username:
 *                     type: string
 *                   email:
 *                     type: string
 *                   role:
 *                     type: string
 *                     enum:
 *                       - customer
 *                       - admin
 *       '401':
 *         description: Authentication is required.
 *       '500':
 *         description: Internal server error.
 */
// Users API
router.get('/users', requireApiLogin, getUsers);

/**
 * @openapi
 * /users/{id}:
 *   put:
 *     summary: Update a user's role
 *     description: Allows an authenticated administrator to change only a user's role.
 *     tags:
 *       - Users
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The unique user ID.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - role
 *             properties:
 *               role:
 *                 type: string
 *                 enum:
 *                   - customer
 *                   - admin
 *     responses:
 *       '200':
 *         description: User role updated successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 displayName:
 *                   type: string
 *                 username:
 *                   type: string
 *                 email:
 *                   type: string
 *                 role:
 *                   type: string
 *                   enum:
 *                     - customer
 *                     - admin
 *       '400':
 *         description: The role is missing or invalid.
 *       '401':
 *         description: Authentication is required.
 *       '403':
 *         description: Administrator authorization is required.
 *       '404':
 *         description: The user was not found.
 *       '500':
 *         description: Internal server error.
 */
router.put('/users/:id', requireApiRole('admin'), updateUserRole);

/**
 * @openapi
 * /users/{id}:
 *   delete:
 *     summary: Delete a user
 *     description: Allows an authenticated administrator to delete a user.
 *     tags:
 *       - Users
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The unique user ID.
 *     responses:
 *       '204':
 *         description: User deleted successfully.
 *       '401':
 *         description: Authentication is required.
 *       '403':
 *         description: Administrator authorization is required.
 *       '404':
 *         description: The user was not found.
 *       '500':
 *         description: Internal server error.
 */
router.delete('/users/:id', requireApiRole('admin'), deleteUser);

export default router;