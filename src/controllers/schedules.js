import { getSchedulesByTripId } from '../models/schedules.js';

export async function getSchedulesForTrip(req, res) {
    try {
        const schedules = await getSchedulesByTripId(req.params.id);

        return res.status(200).json(schedules);
    } catch (error) {
        return res.status(500).json({
            error: 'Unable to retrieve schedules'
        });
    }
}

export async function getSchedulesForTripAndMonth(req, res) {
    const tripId = req.params.id;
    const month = Number(req.query.month);

    if (!Number.isInteger(month) || month < 1 || month > 12) {
        return res.status(400).json({
            error: 'Invalid month. Enter a number between 1 and 12.'
        });
    }

    try {
        const schedules = await getSchedulesByTripId(tripId, month);

        return res.status(200).json(schedules);
    } catch (error) {
        return res.status(500).json({
            error: 'Unable to retrieve schedules'
        });
    }
}