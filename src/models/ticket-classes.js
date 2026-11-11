//src/models/ticket-classes.js
import ticketClass from "./schemas/ticket-classes.js";

/*
 * PLAIN ENGLISH: This file holds the functions that fetch ticket classes
 *   from the database. Think of it as the clerk who goes and gets the forms.
 * LOGIC: Each function uses the Mongoose model from the schema file to ask
 *   the database a question and return the answer.
 * WHY WE NEED IT: Controllers should not talk to the database directly.
 *   Keeping database code here means it can change without touching the
 *   controllers.
 * LEARNING GAP: The data comes from the "ticketClasses" collection in the
 *   shared team MongoDB database. This file does not send anything to the
 *   browser. That is the controller's job.
 */

/*
 * PLAIN ENGLISH: Passes along the list of valid day names.
 * LOGIC: Re-exports DAYS_OF_WEEK from the schema file.
 * WHY WE NEED IT: The controller needs this list to check the day a user
 *   sends. This way the controller only ever imports from the model file.
 * LEARNING GAP: This does not make a second copy of the list. It points to
 *   the same one, so there is still only one place to change it.
 */
export { DAYS_OF_WEEK } from "./schemas/ticket-classes.js";

/*
 * PLAIN ENGLISH: Get every ticket class.
 * LOGIC: find({}) with empty curly braces means "no filter, give me all".
 *   lean() returns plain data instead of heavier Mongoose objects.
 * WHY WE NEED IT: The booking page needs all three classes to draw the
 *   ticket cards, and the API route /api/ticket-classes returns them all.
 * LEARNING GAP: This replaces the old line in book.js that used
 *   db.collection('ticketClasses').find({}).toArray(). Same result, new tool.
 */
export async function getAllTicketClasses() {
  return ticketClass.find({}).lean();
}

/*
 * PLAIN ENGLISH: Get only the ticket classes offered on one day.
 * LOGIC: find({ daysOfWeek: day }) returns every ticket class whose
 *   daysOfWeek list contains that day.
 * WHY WE NEED IT: This is the heart of the feature. The booking page asks
 *   "which classes are offered on tuesday?" and this function answers.
 * LEARNING GAP: daysOfWeek is a list, but we compare it to one single day.
 *   MongoDB understands this as "does the list include this value?", so we
 *   do not need to loop through the list ourselves.
 */
export async function getTicketClassesForDay(day) {
  return ticketClass.find({ daysOfWeek: day }).lean();
}
