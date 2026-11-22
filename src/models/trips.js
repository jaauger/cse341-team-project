import trip from './schemas/trips.js';

export async function getTripById(id) {
    return trip.findOne({ id }).lean();
}

export async function getAllTrips() {
    return trip.find({}).lean();
}

export const updateTrip = async (id, tripData) => {
    const allowedUpdates = {};

    if (tripData.name !== undefined) allowedUpdates.name = tripData.name;
    if (tripData.startStation !== undefined) allowedUpdates.startStation = tripData.startStation;
    if (tripData.endStation !== undefined) allowedUpdates.endStation = tripData.endStation;
    if (tripData.region !== undefined) allowedUpdates.region = tripData.region;
    if (tripData.duration !== undefined) allowedUpdates.duration = tripData.duration;
    if (tripData.distance !== undefined) allowedUpdates.distance = tripData.distance;
    if (tripData.operatingMonths !== undefined) allowedUpdates.operatingMonths = tripData.operatingMonths;
    if (tripData.imageUrl !== undefined) allowedUpdates.imageUrl = tripData.imageUrl;
    if (tripData.highlights !== undefined) allowedUpdates.highlights = tripData.highlights;
    if (tripData.bestSeason !== undefined) allowedUpdates.bestSeason = tripData.bestSeason;
    if (tripData.description !== undefined) allowedUpdates.description = tripData.description;

    return trip.findOneAndUpdate(
        { id },
        { $set: allowedUpdates },
        { new: true, runValidators: true }
    ).lean();
};

export const deleteTrip = async (id) => {
    return trip.findOneAndDelete({ id }).lean();
};