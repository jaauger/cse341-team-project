import { Router } from 'express';

import { trainsApi, trainsFiltersApi } from './trains.js';
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
 *     summary: Search, filter, sort, and paginate trains
 *     description: >
 *       Returns available trains in the Kizuna Rail database.
 *       Supports case-insensitive keyword searching, exact-match filters,
 *       sorting, and pagination. Search and filter criteria can be combined.
 *       Results are sorted alphabetically by name unless otherwise specified.
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
 *           maximum: 50
 *           default: 10
 *         description: The maximum number of trains returned per page.
 *       - in: query
 *         name: search
 *         required: false
 *         schema:
 *           type: string
 *         description: >
 *           Case-insensitive literal keyword search across train name,
 *           operator, type, and description.
 *         example: express
 *       - in: query
 *         name: type
 *         required: false
 *         schema:
 *           type: string
 *         description: >
 *           Case-insensitive exact match for train type.
 *           Available values can be retrieved from the trains filters endpoint.
 *         example: Limited Express
 *       - in: query
 *         name: powerSource
 *         required: false
 *         schema:
 *           type: string
 *         description: >
 *           Case-insensitive exact match for power source.
 *           Available values can be retrieved from the trains filters endpoint.
 *         example: Electric
 *       - in: query
 *         name: sortBy
 *         required: false
 *         schema:
 *           type: string
 *           enum:
 *             - name
 *             - operator
 *             - maxSpeedKmh
 *             - capacity
 *           default: name
 *         description: The train property used to sort the results.
 *       - in: query
 *         name: sortOrder
 *         required: false
 *         schema:
 *           type: string
 *           enum:
 *             - asc
 *             - desc
 *           default: asc
 *         description: The direction in which results are sorted.
 *     responses:
 *       '200':
 *         description: >
 *           Successfully retrieved train data, pagination metadata,
 *           and applied query criteria. Searches with no matching records
 *           or pages beyond the available records return an empty trains array.
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
 *                       description: Total number of trains matching the applied criteria.
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
 *                 query:
 *                   type: object
 *                   properties:
 *                     search:
 *                       type: string
 *                       description: The applied search keyword, or an empty string.
 *                       example: ''
 *                     filters:
 *                       type: object
 *                       properties:
 *                         type:
 *                           type: string
 *                           nullable: true
 *                           description: The applied train type filter, or null.
 *                           example: null
 *                         powerSource:
 *                           type: string
 *                           nullable: true
 *                           description: The applied power source filter, or null.
 *                           example: null
 *                     sortBy:
 *                       type: string
 *                       enum:
 *                         - name
 *                         - operator
 *                         - maxSpeedKmh
 *                         - capacity
 *                       example: name
 *                     sortOrder:
 *                       type: string
 *                       enum:
 *                         - asc
 *                         - desc
 *                       example: asc
 *       '400':
 *         description: Invalid pagination, search, filter, or sorting parameters.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                 allowedFields:
 *                   type: array
 *                   description: Returned when an invalid sorting field is requested.
 *                   items:
 *                     type: string
 *             examples:
 *               invalidPagination:
 *                 summary: Invalid pagination parameters
 *                 value:
 *                   error: Page and limit must be positive integers.
 *               invalidSortField:
 *                 summary: Unsupported sorting field
 *                 value:
 *                   error: Invalid sort field.
 *                   allowedFields:
 *                     - name
 *                     - operator
 *                     - maxSpeedKmh
 *                     - capacity
 *               invalidSortOrder:
 *                 summary: Unsupported sorting direction
 *                 value:
 *                   error: Sort order must be asc or desc.
 *               invalidFilter:
 *                 summary: Invalid search or filter parameter
 *                 value:
 *                   error: Search and filter parameters must be strings.
 *       '500':
 *         description: Internal server error.
 */
// Trains API
router.get('/trains', trainsApi);

/**
 * @openapi
 * /trains/filters:
 *   get:
 *     summary: Get available train filter options
 *     description: >
 *       Returns distinct train types and power sources from the database.
 *       Values are returned alphabetically, excluding missing, empty,
 *       and non-string values. Used to dynamically populate the train
 *       catalog filter controls.
 *     tags:
 *       - Trains
 *     responses:
 *       '200':
 *         description: Successfully retrieved available filter options.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 types:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example:
 *                     - Limited Express
 *                     - Mountain Railway
 *                     - Steam Excursion
 *                 powerSources:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example:
 *                     - Diesel
 *                     - Electric
 *                     - Hybrid
 *                     - Steam
 *       '500':
 *         description: Internal server error.
 */
router.get('/trains/filters', trainsFiltersApi);

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
 *     summary: Get a paginated user list
 *     description: >
 *       Returns a paginated user list sorted by username. Administrators
 *       receive all users. Other authenticated users receive only their own
 *       account. Valid requests with no users on the requested page return
 *       an empty users array and pagination metadata.
 *     tags:
 *       - Users
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number to return; must be a positive integer.
 *       - in: query
 *         name: limit
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 10
 *         description: Number of users per page; must be between 1 and 50.
 *       - in: query
 *         name: sortBy
 *         required: false
 *         schema:
 *           type: string
 *           enum:
 *             - username
 *           default: username
 *         description: User field used for sorting.
 *       - in: query
 *         name: sortOrder
 *         required: false
 *         schema:
 *           type: string
 *           enum:
 *             - asc
 *             - desc
 *           default: asc
 *         description: Sort direction; username sorting is case-insensitive.
 *     responses:
 *       '200':
 *         description: Successfully retrieved user data and pagination metadata.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 users:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       displayName:
 *                         type: string
 *                       username:
 *                         type: string
 *                       email:
 *                         type: string
 *                       role:
 *                         type: string
 *                         nullable: true
 *                         enum:
 *                           - customer
 *                           - admin
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     totalItems:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *                     currentPage:
 *                       type: integer
 *                     itemsPerPage:
 *                       type: integer
 *                     hasNextPage:
 *                       type: boolean
 *                     hasPreviousPage:
 *                       type: boolean
 *                 query:
 *                   type: object
 *                   properties:
 *                     sortBy:
 *                       type: string
 *                       enum:
 *                         - username
 *                     sortOrder:
 *                       type: string
 *                       enum:
 *                         - asc
 *                         - desc
 *             example:
 *               users: []
 *               pagination:
 *                 totalItems: 13
 *                 totalPages: 2
 *                 currentPage: 1
 *                 itemsPerPage: 10
 *                 hasNextPage: true
 *                 hasPreviousPage: false
 *               query:
 *                 sortBy: username
 *                 sortOrder: asc
 *       '400':
 *         description: Invalid pagination or sorting parameters.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                 allowedFields:
 *                   type: array
 *                   items:
 *                     type: string
 *                     enum:
 *                       - username
 *             examples:
 *               invalidPagination:
 *                 summary: Invalid page or limit
 *                 value:
 *                   error: Page and limit must be positive integers.
 *               invalidSortField:
 *                 summary: Unsupported sort field
 *                 value:
 *                   error: Invalid sort field.
 *                   allowedFields:
 *                     - username
 *               invalidSortOrder:
 *                 summary: Unsupported sort direction
 *                 value:
 *                   error: Sort order must be asc or desc.
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