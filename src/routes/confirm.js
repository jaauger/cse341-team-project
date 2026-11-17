import { getBookingById } from '../models/bookings.js';

/*
 * PLAIN ENGLISH: Show the "thank you" page for one booking.
 * LOGIC: Read the confirmation code from the web address. Ask the model for
 *   the booking with that code. If there is no booking, show the 404
 *   "not found" page. If there is, show the trips/confirm page.
 * WHY WE NEED IT: Bookings are now saved in the "bookings" collection, not
 *   "confirmations." Without this change, the thank-you page would look in
 *   the old place and find nothing.
 * LEARNING GAP: The page file (src/views/trips/confirm.ejs) uses the name
 *   "confirmation" in about 10 places. We send the booking in under that
 *   same name (confirmation: booking), so the page did not need any changes.
 *   Before, a fake code made the page crash because it tried to read data
 *   that was not there. Now a fake code shows the 404 page instead.
 *   The 404 page must be sent a title, because the shared page header
 *   (src/views/partials/header.ejs) puts the title in the browser tab.
 *   Without a title, the header itself crashes.
 *   next(error) hands any unexpected problem to the app's error page.
 * DATA COMES FROM: getBookingById in src/models/bookings.js, which reads the
 *   "bookings" collection. The code comes from the web address
 *   /trips/confirmation/:confirmationId.
 */
export default async (req, res, next) => {
    try {
        const { confirmationId } = req.params;

        const booking = await getBookingById(confirmationId);

        if (!booking) {
            return res.status(404).render('errors/404', { title: 'Page Not Found' });
        }

        return res.render('trips/confirm', {
            title: 'Trip Confirmation',
            confirmation: booking
        });
    } catch (error) {
        return next(error);
    }
};
