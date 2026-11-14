import { 
    getAllTrips as findAllTrips, 
    getTripById as findTripById
} from "../models/trips.js";
import { getDb } from '../db/connect.js';

export async function getTripById(req, res) {
    try {
        const { id } = req.params;
        const trip = await findTripById(id);
        if (!trip) {
            return res.status(404).json({ message: "Trip not found" });
        }
        // Success
        return res.status(200).json(trip);
    } catch (error) {
        console.error("Error fetching trip:", error);

        return res.status(500).json({ message: "Failed to fetch trip" });
    }
}

export async function getAllTrips(req, res) {
    try {
        const trips = await findAllTrips();
        // Success
        return res.status(200).json(trips);
    } catch (error) {
        console.error("Error fetching trips:", error);
        return res.status(500).json({ message: "Failed to fetch trips" });
    }
}

export async function getTripDetailsPage(req, res) {
    const db = getDb();
    const { tripId } = req.params;
    const details = await findTripById(tripId);

    // Fetch schedules for the trip that will be deleted in next feature to be replaced
    details.schedules = await db.collection('schedules').find({ tripId }).toArray();

    res.render('trips/details', { title: 'Trip Details', details });
};

export async function getTripsListPage(req, res) {
    res.render('trips/list', { title: 'Scenic Train Trips' });
};
