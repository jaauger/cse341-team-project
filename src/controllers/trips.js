import {
    getPaginatedTrips as findPaginatedTrips,
    getTripById as findTripById,
    updateTrip as updateTripInDb,
    deleteTrip as deleteTripFromDb
} from '../models/trips.js';

import {
    updateSchedulesForTrip,
    unassignSchedulesForTrip
} from '../models/schedules.js';

const MAX_LIMIT = 50;

export async function getTripById(req, res) {
    try {
        const { id } = req.params;
        const trip = await findTripById(id);
        if (!trip) {
            return res.status(404).json({ message: 'Trip not found' });
        }
        return res.status(200).json(trip);
    } catch (error) {
        console.error('Error fetching trip:', error);
        return res.status(500).json({ message: 'Failed to fetch trip' });
    }
}

export async function getAllTrips(req, res) {
    try {
        const pageParam = req.query.page ?? '1';
        const limitParam = req.query.limit ?? '10';

        const isPositiveInteger = (value) =>
            typeof value === 'string' && /^[1-9]\d*$/.test(value);

        if (!isPositiveInteger(pageParam) || !isPositiveInteger(limitParam)) {
            return res.status(400).json({
                error: 'Page and limit must be positive integers.'
            });
        }

        const page = Number(pageParam);
        const limit = Number(limitParam);

        if (
            !Number.isSafeInteger(page) ||
            page < 1 ||
            !Number.isSafeInteger(limit) ||
            limit < 1 ||
            limit > MAX_LIMIT
        ) {
            return res.status(400).json({
                error: `Page must be a positive integer and limit must be between 1 and ${MAX_LIMIT}.`
            });
        }

        if (!Number.isSafeInteger((page - 1) * limit)) {
            return res.status(400).json({
                error: 'Requested page is too large.'
            });
        }

        const { trips, totalItems } = await findPaginatedTrips({ page, limit });

        const totalPages = Math.ceil(totalItems / limit);

        const pagination = {
            totalItems,
            totalPages,
            currentPage: page,
            itemsPerPage: limit,
            hasNextPage: page < totalPages,
            hasPreviousPage: page > 1 && totalPages > 0
        };

        const query = {
            search: '',
            filters: {},
            sortBy: 'name',
            sortOrder: 'asc'
        };

        return res.status(200).json({
            trips,
            pagination,
            query
        });
    } catch (error) {
        console.error('Error fetching trips:', error);
        return res.status(500).json({ error: 'Failed to fetch trips' });
    }
}

export async function getTripDetailsPage(req, res) {
    const { tripId } = req.params;
    const details = await findTripById(tripId);

    if (!details) {
        return res.status(404).render('errors/404');
    }

    return res.render('trips/details', {
        title: 'Trip Details',
        details
    });
}

export async function getTripsListPage(req, res) {
    return res.render('trips/list', { title: 'Scenic Train Trips' });
}

export const tripsAdminPage = (req, res) => {
    return res.render('trips/admin', { title: 'Trip Admin | Kizuna Rail' });
};

export const updateTrip = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            name,
            startStation,
            endStation,
            region,
            duration,
            distance,
            operatingMonths,
            bestSeason,
            description,
            scheduleIds
        } = req.body;

        if (!name || !startStation || !endStation || !region || !duration || distance === undefined) {
            return res.status(400).json({ message: 'Missing required trip fields.' });
        }

        const parsedDistance = Number(distance);
        if (Number.isNaN(parsedDistance) || parsedDistance <= 0) {
            return res.status(400).json({ message: 'Distance must be a positive number.' });
        }

        const parsedMonths = Array.isArray(operatingMonths)
            ? operatingMonths
                .map((month) => Number(month))
                .filter((month) => Number.isInteger(month) && month >= 1 && month <= 12)
            : undefined;

        if (parsedMonths !== undefined && parsedMonths.length === 0) {
            return res.status(400).json({ message: 'Operating months must include at least one valid month (1-12).' });
        }

        const updatedTrip = await updateTripInDb(id, {
            name: String(name).trim(),
            startStation: String(startStation).trim(),
            endStation: String(endStation).trim(),
            region: String(region).trim(),
            duration: String(duration).trim(),
            distance: parsedDistance,
            operatingMonths: parsedMonths,
            bestSeason: bestSeason !== undefined ? String(bestSeason).trim() : undefined,
            description: description !== undefined ? String(description).trim() : undefined
        });

        if (!updatedTrip) {
            return res.status(404).json({ message: 'Trip not found.' });
        }

        if (Array.isArray(scheduleIds)) {
            await updateSchedulesForTrip(id, scheduleIds);
        }

        return res.status(200).json(updatedTrip);
    } catch (error) {
        console.error('Error updating trip:', error);
        if (error.name === 'ValidationError' || error.name === 'CastError') {
            return res.status(400).json({ message: 'Invalid trip data.' });
        }
        return res.status(500).json({ message: 'Failed to update trip.' });
    }
};

export const deleteTrip = async (req, res) => {
    try {
        const { id } = req.params;
        const deletedTrip = await deleteTripFromDb(id);

        if (!deletedTrip) {
            return res.status(404).json({ message: 'Trip not found.' });
        }

        await unassignSchedulesForTrip(id);
        return res.status(204).send();
    } catch (error) {
        console.error('Error deleting trip:', error);
        return res.status(500).json({ message: 'Failed to delete trip.' });
    }
};