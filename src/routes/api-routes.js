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

export default router;
