// src/models/bookings.js
import booking from "./schemas/bookings.js";

/*
 * PLAIN ENGLISH: Save one new booking in the database.
 * LOGIC: booking.create() checks the data against the booking blueprint
 *   (src/models/schemas/bookings.js), then saves it to the "bookings"
 *   collection. toObject() turns the saved booking into a plain object.
 * WHY WE NEED IT: processBookingRequest calls this when a customer submits
 *   the booking form. It replaces the old line that saved straight into
 *   the "confirmations" collection.
 * LEARNING GAP: If a required field is missing, create() throws an error
 *   instead of saving bad data. The controller catches that error.
 *   toObject() gives back the same kind of plain object that .lean() gives
 *   in the two functions below, so every function returns the same shape.
 * DATA COMES FROM: The booking form (src/views/trips/book.ejs) plus the
 *   confirmation code made in src/controllers/bookings.js.
 */
export async function createBooking(bookingData) {
  const newBooking = await booking.create(bookingData);
  return newBooking.toObject();
}

/*
 * PLAIN ENGLISH: Get every booking in the database.
 * LOGIC: find({}) means "find all," with no filter. sort({ createdAt: -1 })
 *   puts the newest bookings first. lean() returns plain objects.
 * WHY WE NEED IT: The /api/bookings API uses this to send the list of
 *   bookings to the Bookings Admin page.
 * LEARNING GAP: If there are no bookings, this returns an empty list [],
 *   not an error. An empty list is a normal, successful answer.
 *   -1 means newest first. 1 would mean oldest first.
 * DATA COMES FROM: The "bookings" collection in the shared MongoDB database.
 */
export async function getAllBookings() {
  return booking.find({}).sort({ createdAt: -1 }).lean();
}

/*
 * PLAIN ENGLISH: Get one booking by its confirmation code.
 * LOGIC: findOne({ id }) looks for the booking whose id matches the code.
 *   lean() returns a plain object.
 * WHY WE NEED IT: The thank-you page (src/routes/confirm.js) uses this to
 *   show the booking details. It replaces the old line that read straight
 *   from the "confirmations" collection.
 * LEARNING GAP: If no booking has that code, this returns null (nothing),
 *   not an error. The thank-you page checks for null and shows a
 *   "not found" page instead of crashing.
 *   { id } is short for { id: id }. It matches our own text id, not
 *   MongoDB's built-in _id, the same as getTrainById in trains.js.
 * DATA COMES FROM: The "bookings" collection in the shared MongoDB database.
 */
export async function getBookingById(id) {
  return booking.findOne({ id }).lean();
}
