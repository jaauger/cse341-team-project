import mongoose from 'mongoose';
import Schedule from './schemas/schedules.js';

export async function getSchedulesByTripId(tripId, month) {

    if (month !== undefined) {
        const trip = await mongoose.connection.db
            .collection('trips')
            .findOne({ id: tripId });

        if (!trip || !trip.operatingMonths?.includes(month)) {
            return [];
        }
    }

    return await Schedule.find({ tripId });
}