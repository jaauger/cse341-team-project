// src/controllers/bookings.js
import { getDb } from "../db/connect.js";
import { generateConfirmationCode } from "../includes/helpers.js";
import { getAllTicketClasses } from "../models/ticket-classes.js";
import {
  createBooking,
  getBookingById,
  getPaginatedBookings,
  buildPassengerEmailFilter,
  updateBookingById,
  deleteBookingById,
  getUserEmailById,
} from "../models/bookings.js";

/*
 * PLAIN ENGLISH: The seven days a booking can be for.
 * LOGIC: A list of allowed day names, all in lowercase.
 * WHY WE NEED IT: When someone edits a booking, the new day must be one of
 *   these. This stops typos like "funday" from being saved.
 * LEARNING GAP: Days are saved in lowercase (like tuesday), the same as the
 *   booking form and the Ticket Classes feature (PR #6). We lowercase what
 *   the user sends before checking, so "Tuesday" still works.
 * DATA COMES FROM: Written here in the code. It is not stored in the database.
 */
const VALID_DAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

/*
 * PLAIN ENGLISH: The paging rules for the bookings list.
 * LOGIC: Page 1 and 10 per page are used when the request does not say.
 *   No one can ask for more than 50 bookings at once.
 * WHY WE NEED IT: Week 5 Feature Set 3 (issue #35) asks for the list to come
 *   10 at a time. These match Jason's Train Pagination (PR #31) so every
 *   list in our API follows the same rules.
 * LEARNING GAP: The maximum protects the database. Without it, someone could
 *   ask for limit=100000 and make the server do a lot of work at once.
 * DATA COMES FROM: Written here in the code, agreed on with the team.
 */
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

/*
 * PLAIN ENGLISH: How the bookings list is always sorted, and how long one
 *   day is.
 * LOGIC: SORT_BY and SORT_ORDER say "by booking date, newest first."
 *   ONE_DAY_MS is one day in milliseconds (24 hours x 60 minutes x
 *   60 seconds x 1000).
 * WHY WE NEED IT: Issue #43 asks every filtered answer to include a "query"
 *   info card that says how the list was sorted, the same as Jason's Trains
 *   search (PR #34). ONE_DAY_MS lets the end date include the WHOLE day.
 * LEARNING GAP: The real sorting happens in getPaginatedBookings in the
 *   model file ({ createdAt: -1 }). These two words only REPORT that rule
 *   in the info card. Bookings has no sortBy choice for users, because the
 *   assignment says the list is sorted by booking date.
 * DATA COMES FROM: Written here in the code.
 */
const SORT_BY = "createdAt";
const SORT_ORDER = "desc";
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

/*
 * PLAIN ENGLISH: Check that a value is real text, not empty or just spaces.
 * LOGIC: It must be a string, and after trim() removes the spaces at the
 *   start and end, it must still have at least one character.
 * WHY WE NEED IT: Passenger names, emails, and the ticket class must not be
 *   blank when someone edits a booking.
 * LEARNING GAP: "   " (only spaces) is technically a string, so checking the
 *   type alone is not enough. trim() catches it.
 * DATA COMES FROM: The edit form values sent in the request body.
 */
function isNonEmptyText(value) {
  return typeof value === "string" && value.trim().length > 0;
}

/*
 * PLAIN ENGLISH: Is this text a whole number of 1 or more, like "1" or
 *   "25"?
 * LOGIC: The pattern /^[1-9]\d*$/ means "starts with 1 to 9, then only
 *   digits, and nothing else." So "0", "-1", "1.5", "abc", and "" all fail.
 * WHY WE NEED IT: page and limit must be positive whole numbers. This is the
 *   same check Jason uses in Train Pagination (PR #31).
 * LEARNING GAP: Everything in a web address arrives as TEXT, even numbers.
 *   ?page=2 arrives as "2". We check the text first, then turn it into a
 *   number. typeof value === "string" also catches ?page=1&page=2, which
 *   Express turns into a list instead of text.
 * DATA COMES FROM: req.query.page and req.query.limit.
 */
function isPositiveWholeNumberText(value) {
  return typeof value === "string" && /^[1-9]\d*$/.test(value);
}

/*
 * PLAIN ENGLISH: Read page and limit from the web address, check them, and
 *   work out how many bookings to skip.
 * LOGIC: Use the defaults if they are missing. If either one is not a
 *   positive whole number, or limit is over 50, return { error }.
 *   Otherwise, return { page, limit, skip }. skip = (page - 1) * limit, so
 *   page 1 skips 0, page 2 skips 10, page 3 skips 20.
 * WHY WE NEED IT: Issue #35 says bad page or limit values must get a clear
 *   400 answer instead of a broken database search.
 * LEARNING GAP: This returns a result instead of sending the response
 *   itself, the same idea as buildBookingUpdate below. The controller
 *   decides what to send. The error messages match Jason's word for word,
 *   so the whole API sounds the same.
 *   Number.isSafeInteger catches numbers too big for JavaScript to count
 *   exactly, like page=99999999999999999999.
 * DATA COMES FROM: req.query (the part of the web address after the "?").
 */
function readPagination(query) {
  const pageText = query.page ?? String(DEFAULT_PAGE);
  const limitText = query.limit ?? String(DEFAULT_LIMIT);

  if (!isPositiveWholeNumberText(pageText) || !isPositiveWholeNumberText(limitText)) {
    return { error: "Page and limit must be positive integers." };
  }

  const page = Number(pageText);
  const limit = Number(limitText);

  if (!Number.isSafeInteger(page) || !Number.isSafeInteger(limit) || limit > MAX_LIMIT) {
    return {
      error: `Page must be a positive integer and limit must be between 1 and ${MAX_LIMIT}.`,
    };
  }

  const skip = (page - 1) * limit;

  if (!Number.isSafeInteger(skip)) {
    return { error: "Requested page is too large." };
  }

  return { page, limit, skip };
}

/*
 * PLAIN ENGLISH: Build the little "info card" that goes with each page of
 *   bookings.
 * LOGIC: totalPages = total bookings divided by bookings per page, rounded
 *   UP (23 bookings / 10 per page = 3 pages). hasNextPage is true if there
 *   is a page after this one. hasPreviousPage is true if this is not
 *   page 1 and there is at least one page.
 * WHY WE NEED IT: The assignment asks every paged answer to include the
 *   total count, the current page, and the items per page. The Booking
 *   Admin page uses this card to show "Page X of Y" and to turn the
 *   Previous and Next buttons on or off.
 * LEARNING GAP: These names (totalItems, totalPages, currentPage,
 *   itemsPerPage, hasNextPage, hasPreviousPage) match Jason's Train
 *   Pagination exactly, so anyone using our API learns one pattern.
 *   Math.ceil rounds up, because 3 leftover bookings still need a page.
 * DATA COMES FROM: The page and limit from readPagination and the
 *   totalItems count from getPaginatedBookings.
 */
function buildPaginationInfo(page, limit, totalItems) {
  const totalPages = Math.ceil(totalItems / limit);

  return {
    totalItems,
    totalPages,
    currentPage: page,
    itemsPerPage: limit,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1 && totalPages > 0,
  };
}

/*
 * PLAIN ENGLISH: Turn date text like "2026-11-01" into a real date, or
 *   give back null if it is not a real date.
 * LOGIC: First, the pattern /^\d{4}-\d{2}-\d{2}$/ checks the shape:
 *   4 digits, dash, 2 digits, dash, 2 digits. Then we build the date at the
 *   very start of that day in UTC (T00:00:00.000Z). Last, we turn the date
 *   back into text and make sure it is the SAME text we started with.
 * WHY WE NEED IT: Issue #43 says a bad date must get a clear 400 answer
 *   instead of a broken database search.
 * LEARNING GAP: JavaScript quietly "fixes" impossible dates. February 30
 *   becomes March 2 instead of an error. Turning the date back into text
 *   catches that: "2026-03-02" is not "2026-02-30", so we return null.
 *   The "Z" means UTC, so the day starts at the same moment no matter
 *   where the server is. Without it, the server's own time zone would
 *   shift the range by several hours.
 *   YYYY-MM-DD is also the exact format a browser date box sends, so the
 *   Booking Admin page needs no extra changes to match.
 * DATA COMES FROM: req.query.startDate and req.query.endDate, through
 *   readFilters below.
 */
function readDateText(text) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return null;
  }

  const date = new Date(`${text}T00:00:00.000Z`);

  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== text) {
    return null;
  }

  return date;
}

/*
 * PLAIN ENGLISH: Read the ticket class and date range filters from the web
 *   address, check them, and build the "only these bookings" note for the
 *   database.
 * LOGIC: In this order:
 *   1. If any filter was sent twice (Express turns it into a list), return
 *      { error }.
 *   2. Clean each value: trim the spaces, and lowercase the ticket class.
 *      An empty value means "not used."
 *   3. Check each date with readDateText. A bad date → { error }.
 *   4. If both dates are used, the start must not be after the end.
 *   5. Build the database note:
 *      - ticketClass → only bookings with that class.
 *      - startDate → createdAt is on or after the start of that day ($gte).
 *      - endDate → createdAt is before the start of the NEXT day ($lt).
 *   Return { filters, databaseFilter }.
 * WHY WE NEED IT: Issue #43 (Week 5 Feature Set 3, PR 2) asks for filtering
 *   by ticket class and booking date range, with clear 400 errors for bad
 *   values.
 * LEARNING GAP: $gte means "greater than or equal" and $lt means "less
 *   than." These are MongoDB's comparison words.
 *   Why "before the next day" for the end date? A booking made at 3:00 PM
 *   on Nov 30 is AFTER the very start of Nov 30. If we said "on or before
 *   Nov 30 at 00:00," that booking would be left out. "Before Dec 1 at
 *   00:00" keeps the whole last day.
 *   The ticket class is only checked for its SHAPE here. Whether it is a
 *   real class is checked in getAllBookings, because that needs the
 *   database.
 *   "filters" is what goes back in the info card. "databaseFilter" is what
 *   MongoDB reads. They hold the same choices, written two ways.
 * DATA COMES FROM: req.query (the part of the web address after the "?").
 */
function readFilters(query) {
  const { ticketClass, startDate, endDate } = query;

  if (
    (ticketClass !== undefined && typeof ticketClass !== "string") ||
    (startDate !== undefined && typeof startDate !== "string") ||
    (endDate !== undefined && typeof endDate !== "string")
  ) {
    return {
      error: "ticketClass, startDate, and endDate can each be sent only once.",
    };
  }

  const ticketClassText = ticketClass ? ticketClass.trim().toLowerCase() : "";
  const startText = startDate ? startDate.trim() : "";
  const endText = endDate ? endDate.trim() : "";

  const start = startText ? readDateText(startText) : null;
  const end = endText ? readDateText(endText) : null;

  if ((startText && !start) || (endText && !end)) {
    return {
      error: "startDate and endDate must be real dates in YYYY-MM-DD format, like 2026-11-01.",
    };
  }

  if (start && end && start > end) {
    return { error: "startDate must be on or before endDate." };
  }

  const databaseFilter = {};

  if (ticketClassText) {
    databaseFilter.ticketClass = ticketClassText;
  }

  if (start || end) {
    databaseFilter.createdAt = {};

    if (start) {
      databaseFilter.createdAt.$gte = start;
    }

    if (end) {
      databaseFilter.createdAt.$lt = new Date(end.getTime() + ONE_DAY_MS);
    }
  }

  return {
    filters: {
      ticketClass: ticketClassText || null,
      startDate: startText || null,
      endDate: endText || null,
    },
    databaseFilter,
  };
}

/*
 * PLAIN ENGLISH: Build the "query" info card that says which filters and
 *   sorting were used for this list.
 * LOGIC: search is null, the filters are copied in, and sortBy / sortOrder
 *   report "booking date, newest first."
 * WHY WE NEED IT: The assignment asks that filtered answers include the
 *   search filters that were used. The team agreed every list uses the
 *   same shape as Jason's Trains search (PR #34): { search, filters,
 *   sortBy, sortOrder }.
 * LEARNING GAP: search is null because Booking Admin has no keyword search
 *   (the assignment asks only for ticket class and date range). We keep the
 *   slot anyway, so every list in our API looks the same to the person
 *   using it. A filter that was not used shows as null, not left out, so
 *   the card always has the same keys.
 * DATA COMES FROM: The filters from readFilters above.
 */
function buildQueryInfo(filters) {
  return {
    search: null,
    filters,
    sortBy: SORT_BY,
    sortOrder: SORT_ORDER,
  };
}

/*
 * PLAIN ENGLISH: Is this email one of the passengers on this booking?
 * LOGIC: some() looks at each passenger and returns true as soon as one
 *   passenger's email matches. Both emails are turned to lowercase first.
 * WHY WE NEED IT: Feature Set 4 says a normal user can only edit or delete
 *   bookings where they are a passenger.
 * LEARNING GAP: Passenger emails are saved as typed (Sina@Mail.com), but
 *   user emails are saved in lowercase. Lowercasing both makes them match.
 * DATA COMES FROM: The booking from the database and the logged-in user's
 *   email from getUserEmailById.
 */
function isPassenger(bookingRecord, email) {
  const lowerEmail = email.toLowerCase();

  return bookingRecord.passengers.some(
    (passenger) => passenger.email.toLowerCase() === lowerEmail,
  );
}

/*
 * PLAIN ENGLISH: Is the logged-in user allowed to change this booking?
 * LOGIC: Admins are always allowed. Everyone else is allowed only if their
 *   email (looked up by their user id) matches a passenger on the booking.
 * WHY WE NEED IT: Both updateBooking and deleteBooking use the same rule,
 *   so it lives in one place instead of being written twice.
 * LEARNING GAP: This check happens on the SERVER. Even if someone hides or
 *   shows buttons in the browser, the server still decides. Hiding a button
 *   is not security; this check is.
 *   req.user does not hold the email, so we look it up by req.user.id.
 * DATA COMES FROM: req.user (the login session from Feature Set 1) and the
 *   "users" collection through getUserEmailById.
 */
async function canChangeBooking(user, bookingRecord) {
  if (user.role === "admin") {
    return true;
  }

  const email = await getUserEmailById(user.id);

  if (!email) {
    return false;
  }

  return isPassenger(bookingRecord, email);
}

/*
 * PLAIN ENGLISH: Check the edit form data and build a clean update.
 * LOGIC: Check the ticket class, the day, and every passenger. If anything
 *   is wrong, return { error: "message" }. If all is good, return
 *   { updates: {...} } with only the allowed fields, trimmed and cleaned.
 * WHY WE NEED IT: updateBooking must answer 400 with a clear message when
 *   the data is bad, before anything is saved.
 * LEARNING GAP: We copy only the fields we expect (firstName, lastName,
 *   email, phone). Any extra fields someone sneaks in are left behind,
 *   the same "pick each field by name" idea as processBookingRequest.
 *   The ticket class must be one that really exists in the ticket classes
 *   collection, so made-up classes cannot be saved.
 * DATA COMES FROM: req.body (the edit form) and the list of real ticket
 *   class codes from getAllTicketClasses.
 */
function buildBookingUpdate(body, validClasses) {
  const { ticketClass, selectedDay, passengers } = body || {};

  if (!isNonEmptyText(ticketClass) || !validClasses.includes(ticketClass.trim())) {
    return {
      error: `ticketClass must be one of: ${validClasses.join(", ")}.`,
    };
  }

  if (
    !isNonEmptyText(selectedDay) ||
    !VALID_DAYS.includes(selectedDay.trim().toLowerCase())
  ) {
    return { error: "selectedDay must be a day of the week, like monday." };
  }

  if (!Array.isArray(passengers) || passengers.length === 0) {
    return { error: "At least one passenger is required." };
  }

  const cleanPassengers = [];

  for (const passenger of passengers) {
    if (
      !passenger ||
      !isNonEmptyText(passenger.firstName) ||
      !isNonEmptyText(passenger.lastName) ||
      !isNonEmptyText(passenger.email)
    ) {
      return {
        error: "Each passenger needs a firstName, lastName, and email.",
      };
    }

    cleanPassengers.push({
      firstName: passenger.firstName.trim(),
      lastName: passenger.lastName.trim(),
      email: passenger.email.trim(),
      phone: typeof passenger.phone === "string" ? passenger.phone.trim() : "",
    });
  }

  return {
    updates: {
      ticketClass: ticketClass.trim(),
      selectedDay: selectedDay.trim().toLowerCase(),
      passengers: cleanPassengers,
    },
  };
}

/*
 * PLAIN ENGLISH: Send ONE PAGE of bookings as JSON, plus two info cards:
 *   one about the page and one about the filters. Admins page through every
 *   booking. Everyone else pages through only the bookings they are a
 *   passenger on. Either one can narrow the list by ticket class and
 *   booking date range.
 * LOGIC: In this order:
 *   1. Check page and limit with readPagination. Bad values → 400.
 *   2. Check the filters with readFilters. Bad values → 400.
 *   3. If a ticket class was sent, make sure it really exists in the
 *      ticket classes collection. Not real → 400 listing the real ones.
 *   4. Start with the filter note from readFilters. Admins use it as is.
 *      Everyone else also gets "only bookings with their email" added.
 *   5. Ask getPaginatedBookings for that page and the total count.
 *   6. Send 200 with { bookings, pagination, query }.
 *   If something breaks, send status 500 and a short error.
 * WHY WE NEED IT: This answers GET /api/bookings. Week 5 Feature Set 3
 *   asks for the Booking Admin list to come 10 at a time, sorted by booking
 *   date (issue #35), and to be filtered by ticket class and booking date
 *   range (issue #43). Feature Set 4's rule (each person sees the right
 *   list) still applies.
 * LEARNING GAP: The route lock (requireApiLogin) already sent 401 to anyone
 *   not logged in, so by the time this runs, req.user always exists.
 *   The filters are ADDED to the email rule, never swapped for it. So a
 *   normal user who filters by "first" sees only THEIR first class
 *   bookings, not everyone's. { ...a, ...b } copies both notes into one.
 *   The ticket class list is only fetched when a ticket class was sent, so
 *   a normal request does not make an extra trip to the database.
 *   The same filter goes to the page AND the count (in the model), so
 *   totalItems counts only the bookings that match the filters.
 *   No matches is still a success (200) with an empty list, not a 404.
 * DATA COMES FROM: req.query (page, limit, ticketClass, startDate,
 *   endDate), req.user (the login session), the ticket classes collection
 *   (getAllTicketClasses), and getPaginatedBookings in
 *   src/models/bookings.js, which reads the "bookings" collection.
 */
export async function getAllBookings(req, res) {
  try {
    const { error, page, limit, skip } = readPagination(req.query);

    if (error) {
      return res.status(400).json({ error });
    }

    const filterResult = readFilters(req.query);

    if (filterResult.error) {
      return res.status(400).json({ error: filterResult.error });
    }

    const { filters, databaseFilter } = filterResult;

    if (filters.ticketClass) {
      const ticketClasses = await getAllTicketClasses();
      const validClasses = ticketClasses.map((ticketClass) => ticketClass.class);

      if (!validClasses.includes(filters.ticketClass)) {
        return res.status(400).json({
          error: `ticketClass must be one of: ${validClasses.join(", ")}.`,
        });
      }
    }

    const queryInfo = buildQueryInfo(filters);
    let filter = { ...databaseFilter };

    if (req.user.role !== "admin") {
      const email = await getUserEmailById(req.user.id);

      if (!email) {
        return res.status(200).json({
          bookings: [],
          pagination: buildPaginationInfo(page, limit, 0),
          query: queryInfo,
        });
      }

      filter = { ...filter, ...buildPassengerEmailFilter(email) };
    }

    const { bookings, totalItems } = await getPaginatedBookings({
      filter,
      skip,
      limit,
    });

    return res.status(200).json({
      bookings,
      pagination: buildPaginationInfo(page, limit, totalItems),
      query: queryInfo,
    });
  } catch (error) {
    console.error("Error fetching bookings:", error);

    return res.status(500).json({
      error: "Failed to fetch bookings",
    });
  }
}

/*
 * PLAIN ENGLISH: Edit one booking (PUT /api/bookings/:id).
 * LOGIC: In this order:
 *   1. Find the booking by its code. None found → 404.
 *   2. Check the user is an admin or a passenger. Not allowed → 403.
 *   3. Check the new data. Bad data → 400 with a clear message.
 *   4. Save the changes and send back the updated booking → 200.
 * WHY WE NEED IT: Feature Set 4 asks for the ability to update bookings
 *   through the API, secured so only passengers or admins can do it.
 * LEARNING GAP: We check "allowed?" BEFORE "is the data valid?" so a person
 *   who is not allowed learns nothing about the booking from error messages.
 *   A Mongoose "ValidationError" (a blueprint rule failed) is bad data from
 *   the user, so it gets 400, not 500.
 * DATA COMES FROM: req.params.id (the code in the URL), req.body (the edit
 *   form), req.user (the login session), and the ticket classes list.
 */
export async function updateBooking(req, res) {
  try {
    const { id } = req.params;
    const existing = await getBookingById(id);

    if (!existing) {
      return res.status(404).json({ error: `No booking found with id ${id}.` });
    }

    const allowed = await canChangeBooking(req.user, existing);

    if (!allowed) {
      return res.status(403).json({
        error: "You can only change bookings where you are a passenger.",
      });
    }

    const ticketClasses = await getAllTicketClasses();
    const validClasses = ticketClasses.map((ticketClass) => ticketClass.class);
    const { error, updates } = buildBookingUpdate(req.body, validClasses);

    if (error) {
      return res.status(400).json({ error });
    }

    const updated = await updateBookingById(id, updates);

    return res.status(200).json(updated);
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({ error: error.message });
    }

    console.error("Error updating booking:", error);

    return res.status(500).json({ error: "Failed to update booking" });
  }
}

/*
 * PLAIN ENGLISH: Delete one booking (DELETE /api/bookings/:id).
 * LOGIC: In this order:
 *   1. Find the booking by its code. None found → 404.
 *   2. Check the user is an admin or a passenger. Not allowed → 403.
 *   3. Delete it and send status 204 (success, nothing to send back).
 * WHY WE NEED IT: Feature Set 4 asks for the ability to delete bookings
 *   through the API, secured so only passengers or admins can do it.
 * LEARNING GAP: 204 means "it worked, and there is no body." That is why
 *   we use .send() with nothing inside instead of .json(...).
 * DATA COMES FROM: req.params.id (the code in the URL) and req.user (the
 *   login session).
 */
export async function deleteBooking(req, res) {
  try {
    const { id } = req.params;
    const existing = await getBookingById(id);

    if (!existing) {
      return res.status(404).json({ error: `No booking found with id ${id}.` });
    }

    const allowed = await canChangeBooking(req.user, existing);

    if (!allowed) {
      return res.status(403).json({
        error: "You can only delete bookings where you are a passenger.",
      });
    }

    await deleteBookingById(id);

    return res.status(204).send();
  } catch (error) {
    console.error("Error deleting booking:", error);

    return res.status(500).json({ error: "Failed to delete booking" });
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
 *   Who may open this page is decided by the lock on the route in
 *   src/routes/ejs-routes.js, not here.
 * DATA COMES FROM: Nothing yet. The data arrives later from /api/bookings.
 */
export async function bookingsAdminPage(req, res) {
  return res.render("bookings", { title: "Bookings Admin" });
}
