// public/js/bookings-admin.js

/*
 * PLAIN ENGLISH: Make text look nicer by making the first letter a capital.
 * LOGIC: Take the first letter, make it upper case, then add the rest.
 *   If there is no text, send back an empty string.
 * WHY WE NEED IT: The database saves words like "tuesday" and "standard."
 *   On the admin page, "Tuesday" and "Standard" are easier to read.
 * LEARNING GAP: This only changes how the word LOOKS on the page. The
 *   saved data in the database stays exactly the same.
 */
const capitalize = (text) => {
    if (!text) {
        return '';
    }
    return text.charAt(0).toUpperCase() + text.slice(1);
};

/*
 * PLAIN ENGLISH: Turn a saved date into an easy-to-read date, like
 *   "Nov 16, 2026."
 * LOGIC: new Date() reads the saved date. toLocaleDateString() writes it
 *   in month, day, year order.
 * WHY WE NEED IT: The database saves dates in a long computer format that
 *   is hard for people to read.
 * LEARNING GAP: This uses the same date style as the thank-you page
 *   (src/views/trips/confirm.ejs), so both pages look the same.
 */
const formatDate = (value) => {
    if (!value) {
        return '';
    }
    return new Date(value).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
};

/*
 * PLAIN ENGLISH: When the Bookings Admin page opens, get every booking from
 *   the API and show each one as a card.
 * LOGIC: Find the empty spots on the page. Stop if they are missing. Call
 *   /api/bookings. If the list is empty, show "No bookings yet." Otherwise,
 *   copy the hidden template once per booking, fill in each data-field spot,
 *   and put all the cards on the page at once. If anything fails, show a
 *   friendly error message.
 * WHY WE NEED IT: The Bookings feature (issue #16) asks for the admin page
 *   to be filled in by client-side JavaScript calling the bookings API,
 *   not by an EJS loop.
 * LEARNING GAP: Every value is placed with textContent, never innerHTML.
 *   textContent always treats data as plain text, so a name like
 *   <b>Hi</b> shows up as letters, not as real HTML. This keeps the page
 *   safe. This follows the same steps as hookTrainsCatalog in
 *   public/js/main.js.
 * DATA COMES FROM: GET /api/bookings, which reads the "bookings"
 *   collection through src/controllers/bookings.js and
 *   src/models/bookings.js.
 */
document.addEventListener('DOMContentLoaded', async () => {
    const listEl = document.getElementById('bookings-list');
    const templateEl = document.getElementById('booking-card-template');
    const loadingEl = document.getElementById('bookings-loading');
    const errorEl = document.getElementById('bookings-error');
    const emptyEl = document.getElementById('bookings-empty');

    // Stop quietly if this script is ever loaded on a different page.
    if (!listEl || !templateEl) {
        return;
    }

    try {
        const response = await fetch('/api/bookings');
        if (!response.ok) {
            throw new Error(`Failed to load bookings (${response.status})`);
        }

        /*
         * PLAIN ENGLISH: Read the list of bookings from the API answer.
         * LEARNING GAP: Our API sends the list directly, like [ ... ].
         *   The trains API wraps its list, like { trains: [ ... ] }, which
         *   is why the trains code reads payload.trains. We do not need
         *   that here. Array.isArray makes sure we really got a list.
         */
        const bookings = await response.json();
        if (!Array.isArray(bookings)) {
            throw new Error('Bookings data was not a list');
        }

        if (loadingEl) {
            loadingEl.hidden = true;
        }

        if (bookings.length === 0) {
            if (emptyEl) {
                emptyEl.hidden = false;
            }
            return;
        }

        const fragment = document.createDocumentFragment();

        bookings.forEach((booking) => {
            const card = templateEl.content.cloneNode(true);
            const passengers = Array.isArray(booking.passengers) ? booking.passengers : [];

            card.querySelector('[data-field="code"]').textContent = booking.id;
            card.querySelector('[data-field="created"]').textContent = `Booked ${formatDate(booking.createdAt)}`;
            card.querySelector('[data-field="trip"]').textContent = booking.tripId;
            card.querySelector('[data-field="schedule"]').textContent = `#${booking.scheduleId}`;
            card.querySelector('[data-field="day"]').textContent = capitalize(booking.selectedDay);
            card.querySelector('[data-field="ticket-class"]').textContent = capitalize(booking.ticketClass);
            card.querySelector('[data-field="passenger-count"]').textContent = passengers.length;

            /*
             * PLAIN ENGLISH: Add one line for each person on the booking.
             * LOGIC: For each passenger, make a new list item and fill it
             *   with their name and email (and phone, if they gave one).
             * LEARNING GAP: The template cannot know how many people will be
             *   on a booking, so these lines are built here, one by one.
             */
            const passengerListEl = card.querySelector('[data-field="passengers"]');
            passengers.forEach((passenger) => {
                const itemEl = document.createElement('li');
                const phoneText = passenger.phone ? ` · ${passenger.phone}` : '';
                itemEl.textContent = `${passenger.firstName} ${passenger.lastName} · ${passenger.email}${phoneText}`;
                passengerListEl.appendChild(itemEl);
            });

            fragment.appendChild(card);
        });

        listEl.replaceChildren(fragment);
    } catch (error) {
        console.error('Error loading bookings:', error);
        if (loadingEl) {
            loadingEl.hidden = true;
        }
        if (errorEl) {
            errorEl.hidden = false;
            errorEl.textContent = 'Unable to load bookings right now. Please try again in a moment.';
        }
    }
});
