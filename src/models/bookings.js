// src/models/bookings.js
import booking from "./schemas/bookings.js";
import User from "./schemas/users.js";

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
 *   in the functions below, so every function returns the same shape.
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
 * WHY WE NEED IT: The /api/bookings API used this to send the full list of
 *   bookings to an admin on the Bookings Admin page. Week 5 pagination now
 *   uses getPaginatedBookings instead, but this stays for any other code
 *   that needs the full list.
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
 *   show the booking details. Feature Set 4 also uses it to check who is
 *   on a booking before allowing an edit or delete.
 * LEARNING GAP: If no booking has that code, this returns null (nothing),
 *   not an error. The code that calls it checks for null and answers
 *   "not found" instead of crashing.
 *   { id } is short for { id: id }. It matches our own text id, not
 *   MongoDB's built-in _id, the same as getTrainById in trains.js.
 * DATA COMES FROM: The "bookings" collection in the shared MongoDB database.
 */
export async function getBookingById(id) {
  return booking.findOne({ id }).lean();
}

/*
 * PLAIN ENGLISH: Make an email safe to use inside a search pattern.
 * LOGIC: Some characters, like the dot in "gmail.com" or a plus sign, have
 *   special meanings in a search pattern (called a regular expression).
 *   This puts a backslash in front of each one so it is read as a normal
 *   character.
 * WHY WE NEED IT: buildPassengerEmailFilter below uses a pattern to match
 *   emails without caring about capital letters. Without this step, a dot
 *   in an email would match ANY character, which could show the wrong
 *   bookings.
 * LEARNING GAP: This function is not exported. Only this file uses it, so
 *   it stays private, like a helper tool kept in one drawer.
 * DATA COMES FROM: The email passed in by buildPassengerEmailFilter.
 */
function escapeForPattern(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/*
 * PLAIN ENGLISH: Write the "only bookings with this email" note that the
 *   database understands.
 * LOGIC: "passengers.email" tells MongoDB to look inside the passengers
 *   list on every booking. The pattern ^...$ means "the whole email must
 *   match," and the "i" flag means capital letters do not matter.
 * WHY WE NEED IT: Week 5 pagination needs this note in two places: to get
 *   one page of a user's bookings AND to count all of that user's bookings.
 *   Writing the rule once here keeps both places matching.
 * LEARNING GAP: This only BUILDS the note. It does not search the database.
 *   Passenger emails are saved exactly as typed (for example,
 *   Sina@Mail.com), but user emails are saved in lowercase. Ignoring
 *   capital letters makes sure those two still match.
 * DATA COMES FROM: The logged-in user's email from getUserEmailById below.
 */
export function buildPassengerEmailFilter(email) {
  const exactEmail = new RegExp(`^${escapeForPattern(email)}$`, "i");

  return { "passengers.email": exactEmail };
}

/*
 * PLAIN ENGLISH: Get only the bookings where a given email is one of the
 *   passengers.
 * LOGIC: Build the email note with buildPassengerEmailFilter, find every
 *   booking that matches it, newest first. lean() returns plain objects.
 * WHY WE NEED IT: Feature Set 4 says a normal (non-admin) user sees only
 *   bookings where their email matches a passenger. Feature Set 2 (the
 *   user dashboard) can reuse this same list.
 * LEARNING GAP: Week 5 moved the email rule into buildPassengerEmailFilter.
 *   This function still works exactly the same way, so any teammate code
 *   that uses it does not break.
 *   If no bookings match, this returns an empty list [], not an error.
 * DATA COMES FROM: The "bookings" collection, plus the logged-in user's
 *   email from getUserEmailById below.
 */
export async function getBookingsByPassengerEmail(email) {
  return booking
    .find(buildPassengerEmailFilter(email))
    .sort({ createdAt: -1 })
    .lean();
}

/*
 * PLAIN ENGLISH: Get ONE PAGE of bookings, plus the total number of
 *   bookings that match, in one trip to the database.
 * LOGIC: find(filter) picks the matching bookings. sort puts them newest
 *   first by booking date (createdAt), and uses _id as a tiebreaker.
 *   skip(skip) jumps over the earlier pages. limit(limit) keeps only one
 *   page. countDocuments(filter) counts ALL matching bookings, not just
 *   this page. Promise.all runs both at the same time and waits for both.
 * WHY WE NEED IT: Week 5 Feature Set 3 (issue #35) asks for the booking list
 *   to come back 10 at a time, sorted by booking date, with the total count
 *   so the page can show "Page X of Y."
 * LEARNING GAP: The SAME filter goes to find() and countDocuments(). That
 *   way a normal user's total counts only THEIR bookings, not everyone's.
 *   The _id tiebreaker matters: if two bookings were made at the same
 *   moment, the order could change between requests and one booking could
 *   show up on two pages. Adding _id makes the order always the same.
 *   This function does not read req or send a response. The controller
 *   checks page and limit first and hands this function only safe numbers.
 * DATA COMES FROM: The "bookings" collection in the shared MongoDB
 *   database, using the filter, skip, and limit sent by the controller.
 */
export async function getPaginatedBookings({ filter = {}, skip, limit }) {
  const [bookings, totalItems] = await Promise.all([
    booking
      .find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    booking.countDocuments(filter),
  ]);

  return { bookings, totalItems };
}

/*
 * PLAIN ENGLISH: Change the editable parts of one booking and give back the
 *   updated booking.
 * LOGIC: findOneAndUpdate({ id }, ...) finds the booking by its confirmation
 *   code and replaces only ticketClass, selectedDay, and passengers.
 *   returnDocument: "after" sends back the booking AFTER the change.
 *   runValidators: true makes Mongoose check the booking blueprint rules
 *   (like required passenger names) during the update.
 * WHY WE NEED IT: Feature Set 4 asks for the ability to update bookings
 *   through the API (PUT /api/bookings/:id).
 * LEARNING GAP: Without runValidators: true, Mongoose skips the blueprint
 *   rules on updates and could save a passenger with no name.
 *   id, scheduleId, and tripId are NOT changed here on purpose: the
 *   confirmation code and the train that was booked stay the same.
 *   If no booking has that code, this returns null.
 * DATA COMES FROM: The edit form on the Bookings Admin page, sent through
 *   the controller after its checks.
 */
export async function updateBookingById(id, updates) {
  const { ticketClass, selectedDay, passengers } = updates;

  return booking
    .findOneAndUpdate(
      { id },
      { ticketClass, selectedDay, passengers },
      { returnDocument: "after", runValidators: true },
    )
    .lean();
}

/*
 * PLAIN ENGLISH: Delete one booking by its confirmation code.
 * LOGIC: findOneAndDelete({ id }) finds the booking and removes it. It
 *   gives back the booking that was deleted, or null if none was found.
 * WHY WE NEED IT: Feature Set 4 asks for the ability to delete bookings
 *   through the API (DELETE /api/bookings/:id).
 * LEARNING GAP: Getting the deleted booking back (instead of only "done")
 *   lets the controller tell the difference between "deleted" and
 *   "there was nothing to delete" (404).
 * DATA COMES FROM: The "bookings" collection in the shared MongoDB database.
 */
export async function deleteBookingById(id) {
  return booking.findOneAndDelete({ id }).lean();
}

/*
 * PLAIN ENGLISH: Look up a user's email address using their user ID.
 * LOGIC: findById() finds the user by MongoDB's built-in _id.
 *   select("email") brings back only the email, nothing else.
 *   If the user is not found, this returns null.
 * WHY WE NEED IT: The login session (req.user) only holds id, displayName,
 *   and role. It does not hold the email. The "my bookings" filter and the
 *   "are you a passenger?" check both need the email.
 * LEARNING GAP: We look the email up here instead of changing the login
 *   code in src/controllers/auth.js. That file belongs to Feature Set 1,
 *   so this keeps our feature from overlapping with a teammate's work.
 *   select("email") also makes sure the password hash is never pulled in.
 * DATA COMES FROM: The "users" collection (User blueprint in
 *   src/models/schemas/users.js), using req.user.id from the session.
 */
export async function getUserEmailById(userId) {
  const user = await User.findById(userId).select("email").lean();

  return user ? user.email : null;
}
