import { getDb } from '../db/connect.js';
import { generateConfirmationCode } from '../includes/helpers.js';
import { getAllTicketClasses } from '../models/ticket-classes.js';

const bookingPage = async (req, res) => {
    const { scheduleId } = req.params;

    const db = getDb();
    const schedule = await db.collection('schedules').findOne({ id: Number(scheduleId) });
    const trip = await db.collection('trips').findOne({ id: schedule.tripId });

    /*
     * PLAIN ENGLISH: Get all the ticket classes for the booking page.
     * LOGIC: Call the model function getAllTicketClasses instead of asking
     *   the database directly. The result is the same list as before.
     * WHY WE NEED IT: The assignment asks this function to use the new
     *   ticket class model. Now only the model knows how ticket classes are
     *   fetched, so that can change later without touching this file.
     * LEARNING GAP: The data still comes from the ticketClasses collection
     *   in the shared database. Only the path to it changed. The schedule
     *   and trip lines above still use the old way because they belong to
     *   other feature sets.
     */
    const ticketClasses = await getAllTicketClasses();
    const ticketOptions = ticketClasses.map((ticketClass) => ({
        class: ticketClass.class,
        name: ticketClass.name,
        price: trip.distance * ticketClass.pricePerKm,
        amenities: ticketClass.amenities,
        description: ticketClass.description
    }));

    res.render('trips/book', {
        title: 'Book Trip',
        schedule,
        ticketOptions
    });
};

const processBookingRequest = async (req, res) => {
    const confirmation = {
        id: generateConfirmationCode(),
        createdAt: new Date().toISOString(),
        ...req.body
    };
    await getDb().collection('confirmations').insertOne(confirmation);

    res.redirect(`/trips/confirmation/${confirmation.id}`);
};

export { bookingPage, processBookingRequest };
