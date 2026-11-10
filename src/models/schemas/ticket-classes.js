//src/models/schemas/ticket-classes.js
import mongoose from "mongoose";

/*
 * PLAIN ENGLISH: This file is the "blank form" for a ticket class. It lists
 *   every field a ticket class has and the rules each field must follow.
 * LOGIC: We describe the fields in a Mongoose schema, then turn the schema
 *   into a model that the rest of the code uses to read the database.
 * WHY WE NEED IT: The assignment moves the project to Mongoose. Without a
 *   schema, Mongoose does not know what a ticket class looks like or where
 *   to find it.
 * LEARNING GAP: The schema is only the rules. It does not fetch anything.
 *   The functions that fetch data live in src/models/ticket-classes.js.
 */

/*
 * PLAIN ENGLISH: The seven day names we accept, in lowercase.
 * LOGIC: A list that the daysOfWeek field checks against. It is exported so
 *   other files can use the same list instead of typing it again.
 * WHY WE NEED IT: Schedules already store days as lowercase words such as
 *   "monday". Using the same format lets the two be compared directly.
 * LEARNING GAP: "Monday" and "monday" are different to a computer. Keeping
 *   one lowercase list in one place avoids mismatches.
 */
export const DAYS_OF_WEEK = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

const ticketClassSchema = new mongoose.Schema(
  {
    /*
     * PLAIN ENGLISH: The short code name of the class.
     * LOGIC: Text, required, no duplicates, and it must be one of the three
     *   values in the enum list.
     * WHY WE NEED IT: The booking page uses this code as the value of each
     *   ticket option, so it must be present and predictable.
     * LEARNING GAP: "unique" means no duplicates. "required" means it cannot
     *   be missing. They are two separate rules, so we set both.
     */
    class: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      enum: ["standard", "premium", "first"],
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    /*
     * PLAIN ENGLISH: The price for each kilometer of the trip.
     * LOGIC: A number that is required and cannot be below zero.
     * WHY WE NEED IT: The booking page multiplies this by the trip distance
     *   to show the ticket price.
     * LEARNING GAP: This is not the ticket price. The price is calculated
     *   later, because it depends on which trip the customer picked.
     */
    pricePerKm: {
      type: Number,
      required: true,
      min: 0,
    },
    amenities: {
      type: [String],
      required: false,
    },
    description: {
      type: String,
      required: false,
      trim: true,
    },
    /*
     * PLAIN ENGLISH: The days of the week this class is offered. NEW FIELD.
     * LOGIC: A list of text values. Each value must be one of the seven day
     *   names in DAYS_OF_WEEK.
     * WHY WE NEED IT: The feature grays out classes that are not offered on
     *   the day the customer picks. Before this field, that information did
     *   not exist anywhere in the project.
     * LEARNING GAP: The square brackets mean "a list of these". Without them
     *   the field could hold only one day.
     */
    daysOfWeek: {
      type: [
        {
          type: String,
          enum: DAYS_OF_WEEK,
        },
      ],
      required: true,
    },
  },
  {
    /*
     * PLAIN ENGLISH: Extra settings for the whole schema.
     * LOGIC: "timestamps" matches the trains example. "collection" tells
     *   Mongoose the exact collection name to read.
     * WHY WE NEED IT: The existing collection is named "ticketClasses" with
     *   a capital C.
     * LEARNING GAP: Without the collection setting, Mongoose would guess the
     *   name "ticketclasses" (all lowercase), find nothing, and return an
     *   empty list with no error message.
     */
    timestamps: true,
    collection: "ticketClasses",
  }
);

const ticketClass = mongoose.model("TicketClass", ticketClassSchema);

export default ticketClass;
