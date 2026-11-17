// src/models/schemas/bookings.js
import mongoose from "mongoose";

/*
 * PLAIN ENGLISH: This is the blueprint for one passenger on a booking.
 * LOGIC: Each passenger has a first name, last name, and email (all required)
 *   and a phone number (optional). trim removes extra spaces at the start
 *   and end of what the person typed.
 * WHY WE NEED IT: A booking can have more than one person on it. This small
 *   blueprint makes sure every person in the list has the same fields.
 * LEARNING GAP: { _id: false } stops Mongoose from giving each passenger its
 *   own hidden ID. Passengers are only part of a booking, not things we look
 *   up on their own, so an extra ID is not needed.
 * DATA COMES FROM: The passengers[0][firstName], [lastName], [email], and
 *   [phone] fields on the booking form in src/views/trips/book.ejs.
 */
const passengerSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: true,
      trim: true,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      required: false,
      trim: true,
    },
  },
  { _id: false }
);

/*
 * PLAIN ENGLISH: This is the blueprint for one booking.
 * LOGIC: It lists every field a booking can have, the type of each field,
 *   and which fields are required. Mongoose checks these rules before it
 *   saves anything to the database.
 * WHY WE NEED IT: Before, the app saved everything the form sent, even extra
 *   fields nobody planned for. Now only the fields listed here are saved.
 * LEARNING GAP: Mongoose quietly drops any field that is not in the schema.
 *   This is called "strict mode," and it is on by default. It works like
 *   only accepting the allowed fields from a form.
 * DATA COMES FROM: The booking form in src/views/trips/book.ejs, plus the
 *   confirmation code made in the booking controller.
 */
const bookingSchema = new mongoose.Schema(
  {
    /*
     * PLAIN ENGLISH: The confirmation code, like KR-AB12CD.
     * LOGIC: unique: true means no two bookings can have the same code.
     * WHY WE NEED IT: The thank-you page finds the booking by this code.
     * LEARNING GAP: This is our own text id, not MongoDB's built-in _id.
     *   The app looks up bookings with { id }, the same as trains and trips.
     */
    id: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    /*
     * PLAIN ENGLISH: Which train time was booked.
     * LOGIC: Stored as a number to match the id in the schedules collection.
     * WHY WE NEED IT: Links the booking to the exact schedule.
     * LEARNING GAP: Forms always send text, like "3". Mongoose turns "3"
     *   into the number 3 automatically because the type is Number.
     */
    scheduleId: {
      type: Number,
      required: true,
    },

    /*
     * PLAIN ENGLISH: Which trip was booked.
     * LOGIC: Stored as text to match the id in the trips collection.
     * WHY WE NEED IT: Links the booking to its trip.
     * LEARNING GAP: This comes from a hidden form field, so the customer
     *   never types it. The page fills it in for them.
     */
    tripId: {
      type: String,
      required: true,
      trim: true,
    },

    /*
     * PLAIN ENGLISH: The type of ticket, like standard.
     * LOGIC: Saved as the text the customer picked on the form.
     * WHY WE NEED IT: The thank-you page shows which ticket was bought.
     * LEARNING GAP: This is the ticket class code, not the price. The price
     *   is worked out on the booking page from the trip distance.
     */
    ticketClass: {
      type: String,
      required: true,
      trim: true,
    },

    /*
     * PLAIN ENGLISH: The day of travel, like tuesday.
     * LOGIC: Saved as the text the customer picked on the form.
     * WHY WE NEED IT: The thank-you page shows the travel day.
     * LEARNING GAP: This is the same day that grays out ticket classes on
     *   the booking page (the Ticket Classes feature from PR #6).
     */
    selectedDay: {
      type: String,
      required: true,
      trim: true,
    },

    /*
     * PLAIN ENGLISH: The list of people on this booking.
     * LOGIC: [passengerSchema] means "a list where every item follows the
     *   passenger blueprint above."
     * WHY WE NEED IT: One booking can be for one person or for a group.
     * LEARNING GAP: The square brackets [ ] mean a list. Without them, the
     *   booking could only hold one passenger.
     */
    passengers: {
      type: [passengerSchema],
      required: true,
    },
  },
  {
    /*
     * PLAIN ENGLISH: Extra settings for the whole booking.
     * LOGIC: timestamps adds createdAt and updatedAt dates automatically.
     *   collection tells Mongoose the exact name of the place to save to.
     * WHY WE NEED IT: The thank-you page shows the booking date from
     *   createdAt. The collection setting is the rename from "confirmations"
     *   to "bookings" that this feature asks for.
     * LEARNING GAP: Mongoose would guess "bookings" from the model name
     *   "Booking" anyway. We still write it out so anyone reading the code
     *   can see exactly where bookings are saved.
     */
    timestamps: true,
    collection: "bookings",
  }
);

/*
 * PLAIN ENGLISH: Turn the blueprint into a model the app can use.
 * LOGIC: mongoose.model("Booking", bookingSchema) creates the Booking model,
 *   and export default lets other files import it.
 * WHY WE NEED IT: The model file (src/models/bookings.js) uses this to save
 *   and find bookings.
 * LEARNING GAP: This follows the same pattern as src/models/schemas/trains.js,
 *   which the assignment gives as the example.
 */
const booking = mongoose.model("Booking", bookingSchema);

export default booking;
