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

    return await Schedule.find({ tripId }).lean();
}

export const getAllSchedules = async () => {
    return Schedule.find({}).sort({ id: 1 }).lean();
};

export const updateSchedulesForTrip = async (tripId, scheduleIds) => {
    const normalizedIds = scheduleIds
        .map((scheduleId) => Number(scheduleId))
        .filter((scheduleId) => !Number.isNaN(scheduleId));

    // Unassign schedules previously linked to this trip that were deselected
    await Schedule.updateMany(
        { tripId, id: { $nin: normalizedIds } },
        { $set: { tripId: 'unassigned' } }
    );

    // Assign all selected existing schedules to this trip
    if (normalizedIds.length > 0) {
        await Schedule.updateMany(
            { id: { $in: normalizedIds } },
            { $set: { tripId } }
        );
    }

    return Schedule.find({ tripId }).sort({ id: 1 }).lean();
};

export const unassignSchedulesForTrip = async (tripId) => {
    await Schedule.updateMany(
        { tripId },
        { $set: { tripId: 'unassigned' } }
    );
};