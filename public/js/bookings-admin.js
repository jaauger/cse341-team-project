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
 * PLAIN ENGLISH: Read the error message the server sent back, if any.
 * LOGIC: Try to read the answer as JSON and use its "error" or "message"
 *   text. If that fails, use the backup message instead.
 * WHY WE NEED IT: Our bookings controller sends { error: "..." } and the
 *   login locks from Feature Set 1 send { message: "..." }. This reads
 *   either one, so the user sees a clear reason.
 * LEARNING GAP: A 204 answer has no body at all, so this is only used
 *   when something went wrong.
 */
const readErrorMessage = async (response, fallback) => {
    try {
        const data = await response.json();
        return data.error || data.message || fallback;
    } catch {
        return fallback;
    }
};

/*
 * PLAIN ENGLISH: When the Bookings Admin page opens, get the bookings from
 *   the API, show each one as a card, and make the Edit and Delete buttons
 *   work.
 * LOGIC: Keep the bookings in a list in memory (the "notepad"). Draw the
 *   cards from that list. After a successful edit or delete, change the
 *   list in memory and draw the cards again. Cancel only redraws.
 * WHY WE NEED IT: The Bookings feature (issue #16) asks for the page to be
 *   filled in by client-side JavaScript calling the bookings API. Feature
 *   Set 4 (issue #19) asks that updates and deletes refresh the list
 *   without a page refresh.
 * LEARNING GAP: Every value is placed with textContent, never innerHTML.
 *   textContent always treats data as plain text, so a name like
 *   <b>Hi</b> shows up as letters, not as real HTML. This keeps the page
 *   safe. This follows the same steps as hookTrainsCatalog in
 *   public/js/main.js.
 * DATA COMES FROM: GET, PUT, and DELETE /api/bookings, plus
 *   GET /api/ticket-classes for the ticket class choices.
 */
document.addEventListener('DOMContentLoaded', async () => {
    const listEl = document.getElementById('bookings-list');
    const templateEl = document.getElementById('booking-card-template');
    const loadingEl = document.getElementById('bookings-loading');
    const errorEl = document.getElementById('bookings-error');
    const emptyEl = document.getElementById('bookings-empty');
    const messageEl = document.getElementById('bookings-message');

    // Stop quietly if this script is ever loaded on a different page.
    if (!listEl || !templateEl) {
        return;
    }

    /*
     * PLAIN ENGLISH: The page's memory.
     * LOGIC: bookings holds the list from the API. ticketClasses holds the
     *   choices for the edit form. editingId remembers which booking's
     *   form is open (null means none).
     * LEARNING GAP: Changing these does not change the screen by itself.
     *   renderBookings() must run to redraw the cards.
     */
    let bookings = [];
    let ticketClasses = [];
    let editingId = null;

    /*
     * PLAIN ENGLISH: Show a short message at the top of the list, like
     *   "Booking KR-AB12CD was updated."
     * LOGIC: Put the text in the message box, add the red error style if it
     *   is a problem, and show the box.
     * LEARNING GAP: The box has aria-live="polite", so screen readers read
     *   the new message without the user having to find it.
     */
    const showMessage = (text, isError = false) => {
        if (!messageEl) {
            return;
        }
        messageEl.textContent = text;
        messageEl.classList.toggle('bookings-error', isError);
        messageEl.hidden = false;
    };

    /*
     * PLAIN ENGLISH: Get the ticket class choices for the edit form.
     * LOGIC: Call /api/ticket-classes. If it works, save the list. If it
     *   fails, keep an empty list; the form then offers only the booking's
     *   current ticket class.
     * LEARNING GAP: This uses the Ticket Classes API from PR #6, so the
     *   choices always match what really exists in the database.
     */
    const loadTicketClasses = async () => {
        try {
            const response = await fetch('/api/ticket-classes');
            if (response.ok) {
                const data = await response.json();
                ticketClasses = Array.isArray(data) ? data : [];
            }
        } catch (error) {
            console.error('Error loading ticket classes:', error);
        }
    };

    /*
     * PLAIN ENGLISH: Make one labeled input box for the edit form.
     * LOGIC: Create a label, put the words and the input inside it, and
     *   give the input its starting value.
     * LEARNING GAP: Putting the input INSIDE its label connects them, so
     *   clicking the words puts the cursor in the box and screen readers
     *   read the label.
     */
    const makeInput = (labelText, name, value, type, required) => {
        const labelEl = document.createElement('label');
        const inputEl = document.createElement('input');

        labelEl.textContent = labelText;
        inputEl.type = type;
        inputEl.value = value || '';
        inputEl.dataset.name = name;
        inputEl.required = required;

        labelEl.appendChild(inputEl);
        return labelEl;
    };

    /*
     * PLAIN ENGLISH: Fill in the edit form with this booking's current
     *   details.
     * LOGIC: Add the ticket class choices and pick the current one. Pick
     *   the current day. Add one group of boxes (first name, last name,
     *   email, phone) for each passenger.
     * LEARNING GAP: data-passenger-row marks each group, so the save step
     *   can read the passengers back in the same order.
     */
    const fillEditForm = (formEl, booking) => {
        const classSelectEl = formEl.querySelector('[data-field="edit-ticket-class"]');
        const daySelectEl = formEl.querySelector('[data-field="edit-day"]');
        const passengersEl = formEl.querySelector('[data-field="edit-passengers"]');

        const choices = ticketClasses.length > 0
            ? ticketClasses
            : [{ class: booking.ticketClass, name: capitalize(booking.ticketClass) }];

        choices.forEach((ticketClass) => {
            const optionEl = document.createElement('option');
            optionEl.value = ticketClass.class;
            optionEl.textContent = ticketClass.name || capitalize(ticketClass.class);
            classSelectEl.appendChild(optionEl);
        });
        classSelectEl.value = booking.ticketClass;
        daySelectEl.value = booking.selectedDay;

        const passengers = Array.isArray(booking.passengers) ? booking.passengers : [];
        passengers.forEach((passenger, index) => {
            const rowEl = document.createElement('div');
            rowEl.className = 'booking-edit-passenger';
            rowEl.dataset.passengerRow = String(index);

            rowEl.appendChild(makeInput('First name', 'firstName', passenger.firstName, 'text', true));
            rowEl.appendChild(makeInput('Last name', 'lastName', passenger.lastName, 'text', true));
            rowEl.appendChild(makeInput('Email', 'email', passenger.email, 'email', true));
            rowEl.appendChild(makeInput('Phone (optional)', 'phone', passenger.phone, 'tel', false));

            passengersEl.appendChild(rowEl);
        });
    };

    /*
     * PLAIN ENGLISH: Build one booking card from the hidden template.
     * LOGIC: Copy the template, fill in each data-field spot, add one line
     *   per passenger, and remember the booking code on the card. If this
     *   booking is being edited, hide the buttons and show the edit form.
     * LEARNING GAP: data-id on the card lets the click and save steps know
     *   which booking the button belongs to.
     */
    const buildCard = (booking) => {
        const card = templateEl.content.cloneNode(true);
        const articleEl = card.querySelector('.booking-card');
        const passengers = Array.isArray(booking.passengers) ? booking.passengers : [];

        articleEl.dataset.id = booking.id;

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

        if (booking.id === editingId) {
            const formEl = card.querySelector('[data-field="edit-form"]');
            card.querySelector('[data-field="actions"]').hidden = true;
            formEl.hidden = false;
            fillEditForm(formEl, booking);
        }

        return card;
    };

    /*
     * PLAIN ENGLISH: Draw all the booking cards from the page's memory.
     * LOGIC: If the list is empty, show "No bookings yet." Otherwise, build
     *   one card per booking and put them all on the page at once.
     * WHY WE NEED IT: After an edit, delete, or cancel, this redraws the
     *   list so the page matches the data, with no page refresh.
     * LEARNING GAP: replaceChildren() swaps out all the old cards in one
     *   step, so the page never shows a half-updated list.
     */
    const renderBookings = () => {
        if (emptyEl) {
            emptyEl.hidden = bookings.length !== 0;
        }

        const fragment = document.createDocumentFragment();
        bookings.forEach((booking) => {
            fragment.appendChild(buildCard(booking));
        });
        listEl.replaceChildren(fragment);
    };

    /*
     * PLAIN ENGLISH: Read the edit form and turn it into the data the PUT
     *   request needs.
     * LOGIC: Read the chosen ticket class and day. Then read each
     *   passenger group, in order, into a list.
     * LEARNING GAP: The names here (ticketClass, selectedDay, passengers)
     *   must match exactly what the server expects, as written in the
     *   Swagger docs for PUT /api/bookings/{id}.
     */
    const readEditForm = (formEl) => {
        const rows = formEl.querySelectorAll('[data-passenger-row]');
        const passengers = Array.from(rows).map((rowEl) => ({
            firstName: rowEl.querySelector('[data-name="firstName"]').value,
            lastName: rowEl.querySelector('[data-name="lastName"]').value,
            email: rowEl.querySelector('[data-name="email"]').value,
            phone: rowEl.querySelector('[data-name="phone"]').value
        }));

        return {
            ticketClass: formEl.querySelector('[data-field="edit-ticket-class"]').value,
            selectedDay: formEl.querySelector('[data-field="edit-day"]').value,
            passengers
        };
    };

    /*
     * PLAIN ENGLISH: Delete one booking after the user says yes.
     * LOGIC: Ask "Are you sure?" If yes, send DELETE. On 204, remove the
     *   booking from memory, redraw, and show a message. Otherwise, show
     *   the server's reason (like 403 "not allowed").
     * LEARNING GAP: confirm() pauses until the user clicks OK or Cancel.
     *   encodeURIComponent makes the booking code safe to put in a URL.
     */
    const deleteBooking = async (id) => {
        const confirmed = window.confirm(`Delete booking ${id}? This cannot be undone.`);
        if (!confirmed) {
            return;
        }

        try {
            const response = await fetch(`/api/bookings/${encodeURIComponent(id)}`, {
                method: 'DELETE'
            });

            if (response.status === 204) {
                bookings = bookings.filter((booking) => booking.id !== id);
                if (editingId === id) {
                    editingId = null;
                }
                renderBookings();
                showMessage(`Booking ${id} was deleted.`);
                return;
            }

            const reason = await readErrorMessage(response, `Could not delete booking (${response.status}).`);
            showMessage(reason, true);
        } catch (error) {
            console.error('Error deleting booking:', error);
            showMessage('Could not delete the booking. Please try again.', true);
        }
    };

    /*
     * PLAIN ENGLISH: Save the edit form for one booking.
     * LOGIC: Send PUT with the form data as JSON. On 200, swap the old
     *   booking in memory for the updated one, close the form, redraw, and
     *   show a message. Otherwise, show the server's reason inside the form.
     * LEARNING GAP: The Content-Type header tells the server "this is
     *   JSON," so express.json() in app.js can read it into req.body.
     */
    const saveBooking = async (id, formEl) => {
        const errorLineEl = formEl.querySelector('[data-field="edit-error"]');
        errorLineEl.hidden = true;

        try {
            const response = await fetch(`/api/bookings/${encodeURIComponent(id)}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(readEditForm(formEl))
            });

            if (response.ok) {
                const updated = await response.json();
                bookings = bookings.map((booking) => (booking.id === id ? updated : booking));
                editingId = null;
                renderBookings();
                showMessage(`Booking ${id} was updated.`);
                return;
            }

            const reason = await readErrorMessage(response, `Could not update booking (${response.status}).`);
            errorLineEl.textContent = reason;
            errorLineEl.hidden = false;
        } catch (error) {
            console.error('Error updating booking:', error);
            errorLineEl.textContent = 'Could not save the booking. Please try again.';
            errorLineEl.hidden = false;
        }
    };

    /*
     * PLAIN ENGLISH: Handle clicks on Edit, Cancel, and Delete for every
     *   card with one listener.
     * LOGIC: Find which button was clicked using data-action, and which
     *   booking it belongs to using the card's data-id.
     * LEARNING GAP: This is called "event delegation." Because the cards
     *   are redrawn often, one listener on the list is simpler than adding
     *   new listeners to every button every time.
     */
    listEl.addEventListener('click', (event) => {
        const buttonEl = event.target.closest('[data-action]');
        if (!buttonEl) {
            return;
        }

        const id = buttonEl.closest('.booking-card').dataset.id;
        const action = buttonEl.dataset.action;

        if (action === 'edit') {
            editingId = id;
            renderBookings();
        } else if (action === 'cancel') {
            // Cancel sends no request. It only closes the form and redraws.
            editingId = null;
            renderBookings();
        } else if (action === 'delete') {
            deleteBooking(id);
        }
    });

    /*
     * PLAIN ENGLISH: Handle the Save button on any edit form.
     * LOGIC: Stop the browser's normal form submit (which would reload the
     *   page), then save with fetch instead.
     * LEARNING GAP: event.preventDefault() is what keeps the page from
     *   refreshing. Without it, the "no page refresh" requirement would fail.
     */
    listEl.addEventListener('submit', (event) => {
        const formEl = event.target.closest('[data-field="edit-form"]');
        if (!formEl) {
            return;
        }

        event.preventDefault();
        const id = formEl.closest('.booking-card').dataset.id;
        saveBooking(id, formEl);
    });

    /*
     * PLAIN ENGLISH: Load everything when the page opens.
     * LOGIC: Get the ticket class choices and the bookings. Hide "Loading,"
     *   then draw the cards. If the bookings request fails, show a friendly
     *   error message instead.
     * LEARNING GAP: Our API sends the list directly, like [ ... ]. The
     *   trains API wraps its list, like { trains: [ ... ] }, which is why
     *   the trains code reads payload.trains. We do not need that here.
     *   Array.isArray makes sure we really got a list.
     */
    try {
        await loadTicketClasses();

        const response = await fetch('/api/bookings');
        if (!response.ok) {
            throw new Error(`Failed to load bookings (${response.status})`);
        }

        const data = await response.json();
        if (!Array.isArray(data)) {
            throw new Error('Bookings data was not a list');
        }

        bookings = data;

        if (loadingEl) {
            loadingEl.hidden = true;
        }

        renderBookings();
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
