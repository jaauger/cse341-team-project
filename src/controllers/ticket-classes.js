//src/controllers/ticket-classes.js
import {
  DAYS_OF_WEEK,
  getAllTicketClasses as findAllTicketClasses,
  getTicketClassesForDay as findTicketClassesForDay,
} from "../models/ticket-classes.js";

/*
 * PLAIN ENGLISH: This file is the front desk for ticket class requests. It
 *   receives a request, asks the model for the data, and sends the answer
 *   back as JSON with a status code.
 * LOGIC: Each function gets req (the request) and res (the response). It
 *   calls a model function, then replies with res.status(...).json(...).
 * WHY WE NEED IT: The assignment asks for API controller functions that
 *   send JSON responses with the right status codes.
 * LEARNING GAP: The model and controller functions have the same names. The
 *   import above renames the model ones (find...) so the two do not clash.
 *   The data itself comes from the model, which reads the "ticketClasses"
 *   collection. The controller never talks to the database.
 */

/*
 * PLAIN ENGLISH: Answer the request "give me all ticket classes".
 * LOGIC: Ask the model for every ticket class and send the list back with
 *   status 200. If anything goes wrong, send status 500 and a general
 *   message.
 * WHY WE NEED IT: This answers GET /api/ticket-classes when no day is given.
 * LEARNING GAP: The real error is written to the server log with
 *   console.error, but it is not sent to the user. Raw error details can
 *   reveal how the system is built, so the user only gets a safe message.
 */
export async function getAllTicketClasses(req, res) {
  try {
    const ticketClasses = await findAllTicketClasses();

    return res.status(200).json(ticketClasses);
  } catch (error) {
    console.error("Error fetching ticket classes:", error);

    return res.status(500).json({
      error: "Failed to fetch ticket classes",
    });
  }
}

/*
 * PLAIN ENGLISH: Answer the request "which ticket classes are offered on
 *   this day?".
 * LOGIC: Read the day from the web address (?day=tuesday). Clean it up by
 *   turning it into text, trimming spaces, and making it lowercase. If it is
 *   not one of the seven day names, reply 400. Otherwise ask the model for
 *   the matching classes and reply 200.
 * WHY WE NEED IT: This answers GET /api/ticket-classes?day=tuesday. The
 *   booking page calls it each time the customer picks a day.
 * LEARNING GAP: 400 means the request itself was wrong (a bad day name).
 *   500 means the request was fine but something broke on our side. An empty
 *   list is still a 200, because "no classes that day" is a valid answer.
 */
export async function getTicketClassesForDay(req, res) {
  try {
    const day = String(req.query.day ?? "")
      .trim()
      .toLowerCase();

    if (!DAYS_OF_WEEK.includes(day)) {
      return res.status(400).json({
        error: "Invalid day. Use a day name from monday to sunday.",
      });
    }

    const ticketClasses = await findTicketClassesForDay(day);

    return res.status(200).json(ticketClasses);
  } catch (error) {
    console.error("Error fetching ticket classes for day:", error);

    return res.status(500).json({
      error: "Failed to fetch ticket classes",
    });
  }
}
