// src/controllers/bookings.js
import { getDb } from "../db/connect.js";
import { generateConfirmationCode } from "../includes/helpers.js";
import { getAllTicketClasses } from "../models/ticket-classes.js";
import {
  createBooking,
  getAllBookings as findAllBookings,
} from "../models/bookings.js";

/*
 * PLAIN ENGLISH: Send the list of all bookings as JSON.
 * LOGIC: Ask the model for every booking. If it works, send status 200
 *   and the list. If something breaks, send status 500 and a short error.
 * WHY WE NEED IT: This answers GET /api/bookings. The Bookings Admin page
 *   calls this API to fill in its list.
 * LEARNING GAP: An empty list [] is still a success (200), not an error.
 *   It just means nobody has booked yet.
 *   We import the model function as findAllBookings because this
 *   controller function already uses the name getAllBookings. This is the
 *   same renaming trick used in src/controllers/trains.js.
 * DATA COMES FROM: getAllBookings in src/models/bookings.js, which reads
 *   the "bookings" collection.
 */
export async function getAllBookings(req, res) {
  try {
    const bookings = await findAllBookings();

    return res.status(200).json(bookings);
  } catch (error) {
    console.error("Error fetching bookings:", error);

    return res.status(500).json({
      error: "Failed to fetch bookings",
    });
  }
}

/*
 * PLAIN ENGLISH: Show the booking form for one train time.
 * LOGIC: Find the schedule and its trip, get the ticket classes, work out
 *   each ticket price, then show the trips/book page.
 * WHY WE NEED IT: The assignment asks us to move bookingPage from
 *   src/routes/book.js into this controller file.
 * LEARNING GAP: Only the location of this function changed. The schedule
 *   and trip lines still use getDb() because they belong to other feature
 *   sets, so we leave them alone. try/catch with next(error) sends any
 *   unexpected problem to the app's error page instead of crashing.
 * DATA COMES FROM: The schedules and trips collections, plus
 *   getAllTicketClasses in src/models/ticket-classes.js.
 */
export async function bookingPage(req, res, next) {
  try {
    const { scheduleId } = req.params;

    const db = getDb();
    const schedule = await db
      .collection("schedules")
      .findOne({ id: Number(scheduleId) });
    const trip = await db.collection("trips").findOne({ id: schedule.tripId });

    /*
     * PLAIN ENGLISH: Get all the ticket classes for the booking page.
     * LOGIC: Call the model function getAllTicketClasses instead of asking
     *   the database directly. The result is the same list as before.
     * WHY WE NEED IT: The Ticket Classes feature (PR #6) asked this function
     *   to use the ticket class model. Now only the model knows how ticket
     *   classes are fetched, so that can change later without touching
     *   this file.
     * LEARNING GAP: The data still comes from the ticketClasses collection
     *   in the shared database. Only the path to it changed.
     */
    const ticketClasses = await getAllTicketClasses();
    const ticketOptions = ticketClasses.map((ticketClass) => ({
      class: ticketClass.class,
      name: ticketClass.name,
      price: trip.distance * ticketClass.pricePerKm,
      amenities: ticketClass.amenities,
      description: ticketClass.description,
    }));

    return res.render("trips/book", {
      title: "Book Trip",
      schedule,
      ticketOptions,
    });
  } catch (error) {
    return next(error);
  }
}

/*
 * PLAIN ENGLISH: Save a new booking when the customer submits the form,
 *   then open the thank-you page.
 * LOGIC: Make a new confirmation code. Copy only the 5 allowed fields from
 *   the form. Save the booking with createBooking. Then go to the
 *   thank-you page for that code.
 * WHY WE NEED IT: The assignment asks us to move processBookingRequest
 *   into this controller and use the new booking model functions. This
 *   replaces the old line that saved into the "confirmations" collection.
 * LEARNING GAP: The old code used ...req.body, which copied EVERYTHING the
 *   form sent, even fields nobody planned for. Because ...req.body came
 *   after id, someone could even send their own confirmation code. Now we
 *   pick each field by name, and the server always makes the code.
 *   createdAt is no longer set here, because timestamps in the booking
 *   blueprint adds it automatically.
 * DATA COMES FROM: The booking form in src/views/trips/book.ejs (req.body),
 *   plus generateConfirmationCode in src/includes/helpers.js.
 */
export async function processBookingRequest(req, res, next) {
  try {
    const { scheduleId, tripId, ticketClass, selectedDay, passengers } =
      req.body;

    const newBooking = await createBooking({
      id: generateConfirmationCode(),
      scheduleId,
      tripId,
      ticketClass,
      selectedDay,
      passengers,
    });

    return res.redirect(`/trips/confirmation/${newBooking.id}`);
  } catch (error) {
    return next(error);
  }
}

/*
 * PLAIN ENGLISH: Show the Bookings Admin page.
 * LOGIC: Only send the page title. The list of bookings is NOT sent here.
 * WHY WE NEED IT: The assignment asks for a bookings admin page at
 *   /bookings-admin with its EJS controller in this file.
 * LEARNING GAP: This function does not call the database at all. The page
 *   opens empty, then JavaScript (public/js/bookings-admin.js) calls
 *   /api/bookings and fills in the list. This is the same "hydration"
 *   pattern as the trains page and the trips list page.
 * DATA COMES FROM: Nothing yet. The data arrives later from /api/bookings.
 */
export async function bookingsAdminPage(req, res) {
  return res.render("bookings", { title: "Bookings Admin" });
}
