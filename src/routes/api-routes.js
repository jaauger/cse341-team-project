import { Router } from 'express';

import { trainsApi } from './trains.js';

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

export default router;