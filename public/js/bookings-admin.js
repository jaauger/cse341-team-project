// public/js/bookings-admin.js

/*
 * PLAIN ENGLISH: How many bookings to show on one page.
 * LOGIC: The page always asks the API for 10 bookings at a time.
 * WHY WE NEED IT: Week 5 (issue #35) asks the Booking Admin page to step
 *   through the bookings 10 at a time.
 * LEARNING GAP: This matches the API's default limit of 10. We still send
 *   limit=10 on purpose, so anyone reading the request can see the page size.
 */
const PAGE_SIZE = 10;

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
 *   in month, day, year order. timeZone: 'UTC' shows the date in UTC.
 * WHY WE NEED IT: The database saves dates in a long computer format that
 *   is hard for people to read.
 * LEARNING GAP: Week 5 PR 2 (issue #43) change: the date filter on this
 *   page works in UTC. Without timeZone: 'UTC', a booking made at 7 PM in
 *   Hawaii (which is already the next day in UTC) would SHOW one date on
 *   the card but be FILTERED as the next day. Showing UTC here makes the
 *   card and the filter always agree. The month, day, year style still
 *   matches the thank-you page (src/views/trips/confirm.ejs).
 */
const formatDate = (value) => {
    if (!value) {
        return '';
    }
    return new Date(value).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        timeZone: 'UTC'
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
 * PLAIN ENGLISH: When the Bookings Admin page opens, get the first page of
 *   bookings from the API, show each one as a card, and make the Edit,
 *   Delete, Previous, Next, Apply, and Clear buttons work.
 * LOGIC: Keep the current page of bookings and the current filters in
 *   memory (the "notepad"). Draw the cards from that list. Previous and
 *   Next ask the API for another page with the same filters. Apply and
 *   Clear change the filters and go back to page 1. After an edit, swap the
 *   one booking in memory. After a delete, ask the API for the current page
 *   again.
 * WHY WE NEED IT: The Bookings feature (issue #16) asks for the page to be
 *   filled in by client-side JavaScript calling the bookings API. Feature
 *   Set 4 (issue #19) asks that updates and deletes refresh the list
 *   without a page refresh. Week 5 adds paging (issue #35) and filtering by
 *   ticket class and booking date range (issue #43).
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
    const paginationEl = document.getElementById('bookings-pagination');
    const prevButtonEl = document.getElementById('bookings-prev');
    const nextButtonEl = document.getElementById('bookings-next');
    const pageInfoEl = document.getElementById('bookings-page-info');
    const filterFormEl = document.getElementById('bookings-filters');
    const filterClassEl = document.getElementById('filter-ticket-class');
    const filterStartEl = document.getElementById('filter-start-date');
    const filterEndEl = document.getElementById('filter-end-date');
    const clearButtonEl = document.getElementById('bookings-clear-filters');

    // Stop quietly if this script is ever loaded on a different page.
    if (!listEl || !templateEl) {
        return;
    }

    /*
     * PLAIN ENGLISH: The page's memory.
     * LOGIC: bookings holds the CURRENT PAGE of bookings from the API.
     *   pagination holds the info card (total, page number, next/previous).
     *   currentPage remembers which page is showing. ticketClasses holds
     *   the choices for the edit form and the filter. editingId remembers
     *   which booking's form is open (null means none). filters holds the
     *   filters being used right now ('' means "not used").
     * LEARNING GAP: Changing these does not change the screen by itself.
     *   renderBookings() and renderPagination() must run to redraw.
     *   filters lives in memory (not read from the boxes every time), so
     *   Previous and Next always use the filters that were last APPLIED,
     *   even if someone changed a box but did not click Apply yet.
     */
    let bookings = [];
    let pagination = null;
    let currentPage = 1;
    let ticketClasses = [];
    let editingId = null;
    let filters = { ticketClass: '', startDate: '', endDate: '' };

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
     * PLAIN ENGLISH: Is any filter being used right now?
     * LOGIC: Look at the three filter values. If any one is not empty,
     *   the answer is true.
     * WHY WE NEED IT: The "no bookings" message should say "No bookings
     *   match these filters." when a filter is on, and "No bookings yet."
     *   when it is not. Those mean different things to the user.
     * LEARNING GAP: some(Boolean) is a short way to ask "is at least one of
     *   these not empty?" An empty string '' counts as false.
     */
    const hasActiveFilters = () => Object.values(filters).some(Boolean);

    /*
     * PLAIN ENGLISH: Add the real ticket classes to the filter dropdown.
     * LOGIC: For each ticket class from the API, make one choice in the
     *   list, using its code (like premium) as the value and its name
     *   (like Premium Class) as the words.
     * WHY WE NEED IT: Issue #43 says the ticket class filter must use real
     *   classes. Using the API list means the dropdown can never offer a
     *   class that does not exist.
     * LEARNING GAP: "All classes" is already in the page (value ''), so it
     *   always stays first. If the API fails, only "All classes" is shown,
     *   and the date filters still work.
     */
    const fillFilterClasses = () => {
        if (!filterClassEl) {
            return;
        }
        ticketClasses.forEach((ticketClass) => {
            const optionEl = document.createElement('option');
            optionEl.value = ticketClass.class;
            optionEl.textContent = ticketClass.name || capitalize(ticketClass.class);
            filterClassEl.appendChild(optionEl);
        });
    };

    /*
     * PLAIN ENGLISH: Get the ticket class choices for the edit form and the
     *   filter.
     * LOGIC: Call /api/ticket-classes. If it works, save the list and fill
     *   the filter dropdown. If it fails, keep an empty list; the edit form
     *   then offers only the booking's current ticket class.
     * LEARNING GAP: This uses the Ticket Classes API from PR #6, so the
     *   choices always match what really exists in the database.
     */
    const loadTicketClasses = async () => {
        try {
            const response = await fetch('/api/ticket-classes');
            if (response.ok) {
                const data = await response.json();
                ticketClasses = Array.isArray(data) ? data : [];
                fillFilterClasses();
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
     * PLAIN ENGLISH: Draw all the booking cards for the current page.
     * LOGIC: If the list is empty, show the right "no bookings" message.
     *   Otherwise, build one card per booking and put them all on the page
     *   at once.
     * WHY WE NEED IT: After an edit, delete, cancel, page change, or filter
     *   change, this redraws the list so the page matches the data, with no
     *   page refresh.
     * LEARNING GAP: replaceChildren() swaps out all the old cards in one
     *   step, so the page never shows a half-updated list.
     *   Week 5 PR 2: when a filter is on, the empty message says "No
     *   bookings match these filters." so the user knows to change or clear
     *   the filters, instead of thinking there are no bookings at all.
     */
    const renderBookings = () => {
        if (emptyEl) {
            emptyEl.textContent = hasActiveFilters()
                ? 'No bookings match these filters.'
                : 'No bookings yet.';
            emptyEl.hidden = bookings.length !== 0;
        }

        const fragment = document.createDocumentFragment();
        bookings.forEach((booking) => {
            fragment.appendChild(buildCard(booking));
        });
        listEl.replaceChildren(fragment);
    };

    /*
     * PLAIN ENGLISH: Update the page bar: "Page X of Y" and the Previous
     *   and Next buttons.
     * LOGIC: Hide the bar if there are no bookings at all. Otherwise, write
     *   the page words, and turn Previous off when hasPreviousPage is false
     *   and Next off when hasNextPage is false.
     * WHY WE NEED IT: Week 5 (issue #35) asks for pagination controls that
     *   step through the results 10 at a time.
     * LEARNING GAP: The buttons follow the info card from the SERVER
     *   (hasNextPage, hasPreviousPage). The page does not count bookings
     *   itself, so the buttons are always right, even for a normal user who
     *   only sees their own bookings, and even when filters are on.
     */
    const renderPagination = () => {
        if (!paginationEl || !pagination) {
            return;
        }

        if (pagination.totalItems === 0) {
            paginationEl.hidden = true;
            return;
        }

        paginationEl.hidden = false;
        pageInfoEl.textContent = `Page ${pagination.currentPage} of ${pagination.totalPages} (${pagination.totalItems} bookings)`;
        prevButtonEl.disabled = !pagination.hasPreviousPage;
        nextButtonEl.disabled = !pagination.hasNextPage;
    };

    /*
     * PLAIN ENGLISH: Build the web address for one page of bookings, with
     *   the current filters added.
     * LOGIC: URLSearchParams builds the part after the "?". page and limit
     *   are always added. Each filter is added only if it is not empty.
     * WHY WE NEED IT: Issue #43 asks for the filters to be sent to
     *   /api/bookings, and the paged results must keep the filters when the
     *   user clicks Previous or Next.
     * LEARNING GAP: URLSearchParams also makes each value safe to put in a
     *   web address (for example, it changes spaces to %20), so we do not
     *   have to do that by hand.
     *   Leaving out empty filters keeps the address short and means "not
     *   used," which the API treats the same as not sending it.
     */
    const buildBookingsUrl = (page) => {
        const params = new URLSearchParams({
            page: String(page),
            limit: String(PAGE_SIZE)
        });

        Object.entries(filters).forEach(([name, value]) => {
            if (value) {
                params.set(name, value);
            }
        });

        return `/api/bookings?${params.toString()}`;
    };

    /*
     * PLAIN ENGLISH: Ask the API for one page of bookings and show it.
     * LOGIC: Call the address from buildBookingsUrl. Check the answer has a
     *   bookings list. Save the list, the info card, and the page number,
     *   then redraw the cards and the page bar. If the page came back empty
     *   but earlier pages exist (for example, after deleting the last
     *   booking on the last page), load the new last page instead.
     * WHY WE NEED IT: Opening the page, clicking Previous or Next, applying
     *   or clearing filters, and deleting a booking all need a fresh page
     *   from the server.
     * LEARNING GAP: The API sends { bookings: [...], pagination: {...},
     *   query: {...} }, the same shape as the trains API, so we read
     *   data.bookings. The page does not need the query card to draw the
     *   list, because it already knows which filters it sent.
     *   Both page buttons are turned off while waiting, so a quick double
     *   click cannot ask for two pages at once.
     *   If something fails, this throws an error, and the code that called
     *   it decides which message to show.
     */
    const loadBookings = async (page) => {
        if (prevButtonEl && nextButtonEl) {
            prevButtonEl.disabled = true;
            nextButtonEl.disabled = true;
        }

        const response = await fetch(buildBookingsUrl(page));
        if (!response.ok) {
            const reason = await readErrorMessage(response, `Failed to load bookings (${response.status})`);
            throw new Error(reason);
        }

        const data = await response.json();
        if (!data || !Array.isArray(data.bookings) || !data.pagination) {
            throw new Error('Bookings data was not in the expected shape');
        }

        if (data.bookings.length === 0 && data.pagination.totalPages > 0 && page > data.pagination.totalPages) {
            await loadBookings(data.pagination.totalPages);
            return;
        }

        bookings = data.bookings;
        pagination = data.pagination;
        currentPage = data.pagination.currentPage;

        renderBookings();
        renderPagination();
    };

    /*
     * PLAIN ENGLISH: Go to another page when Previous or Next is clicked.
     * LOGIC: Close any open edit form, then load the requested page. If it
     *   fails, show a short error message and put the buttons back the way
     *   they were.
     * LEARNING GAP: One helper for both buttons keeps the steps the same.
     *   scrollIntoView brings the top of the list back into view, so the
     *   user does not stay at the bottom of the page after clicking Next.
     *   The filters stay the same, because loadBookings always uses the
     *   filters in memory.
     */
    const goToPage = async (page) => {
        editingId = null;

        try {
            await loadBookings(page);
            listEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } catch (error) {
            console.error('Error changing page:', error);
            showMessage('Could not load that page. Please try again.', true);
            renderPagination();
        }
    };

    if (prevButtonEl && nextButtonEl) {
        prevButtonEl.addEventListener('click', () => goToPage(currentPage - 1));
        nextButtonEl.addEventListener('click', () => goToPage(currentPage + 1));
    }

    /*
     * PLAIN ENGLISH: Use new filters and show page 1 of the results.
     * LOGIC: Remember the old filters. Save the new ones, close any open
     *   edit form, hide old messages, and load page 1. If the server says
     *   no (for example, 400 "startDate must be on or before endDate"),
     *   show its reason in red and go back to the old filters.
     * WHY WE NEED IT: Issue #43 says applying or clearing filters goes back
     *   to page 1, and bad filters get a clear message.
     * LEARNING GAP: Why page 1? If you were on page 3 of ALL bookings and
     *   filter down to 4 premium bookings, there is no page 3 anymore.
     *   Going back to the old filters on an error keeps Previous and Next
     *   working with the last list that loaded successfully.
     *   The server is the one that checks the dates. The page does not
     *   repeat that check, so the rules live in one place.
     */
    const applyFilters = async (newFilters) => {
        const previousFilters = filters;
        filters = newFilters;
        editingId = null;

        if (messageEl) {
            messageEl.hidden = true;
        }

        try {
            await loadBookings(1);
        } catch (error) {
            console.error('Error applying filters:', error);
            filters = previousFilters;
            showMessage(error.message || 'Could not apply the filters. Please try again.', true);
            renderPagination();
        }
    };

    /*
     * PLAIN ENGLISH: Handle the Apply and Clear buttons on the filter bar.
     * LOGIC: Apply: stop the normal form submit, read the three boxes, and
     *   apply them. Clear: empty the boxes with reset() and apply "no
     *   filters."
     * LEARNING GAP: event.preventDefault() stops the browser from reloading
     *   the page, the same as the edit form's Save button. Pressing Enter
     *   in a box also submits the form, so it works like clicking Apply.
     */
    if (filterFormEl && filterClassEl && filterStartEl && filterEndEl) {
        filterFormEl.addEventListener('submit', (event) => {
            event.preventDefault();
            applyFilters({
                ticketClass: filterClassEl.value,
                startDate: filterStartEl.value,
                endDate: filterEndEl.value
            });
        });

        if (clearButtonEl) {
            clearButtonEl.addEventListener('click', () => {
                filterFormEl.reset();
                applyFilters({ ticketClass: '', startDate: '', endDate: '' });
            });
        }
    }

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
     * LOGIC: Ask "Are you sure?" If yes, send DELETE. On 204, ask the API
     *   for the current page again, then show a message. Otherwise, show
     *   the server's reason (like 403 "not allowed").
     * LEARNING GAP: confirm() pauses until the user clicks OK or Cancel.
     *   encodeURIComponent makes the booking code safe to put in a URL.
     *   Week 5 change: we reload the page from the server instead of only
     *   removing the card. Deleting changes the total, so the next booking
     *   should slide up into the empty spot, and "Page X of Y" must update.
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
                if (editingId === id) {
                    editingId = null;
                }
                await loadBookings(currentPage);
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
     *   An edit does not change how many bookings there are, so the page
     *   does not need to be reloaded from the server.
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
     * LOGIC: Get the ticket class choices (for the edit form and the filter
     *   dropdown), then page 1 of the bookings with no filters. Hide
     *   "Loading" either way. If the bookings request fails, show a friendly
     *   error message instead.
     * LEARNING GAP: The page only ever asks for ONE page of bookings. It
     *   never downloads all of them and hides the rest. The server decides
     *   which 10 to send, and the server does the filtering too.
     */
    try {
        await loadTicketClasses();
        await loadBookings(1);

        if (loadingEl) {
            loadingEl.hidden = true;
        }
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
