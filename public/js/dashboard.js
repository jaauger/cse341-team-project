const bookingsStatus = document.getElementById('bookings-status');

const bookingsList = document.getElementById('bookings-list');

function displayBooking(booking) {
    const card = document.createElement('li');

    const passengerCount = booking.passengers.length;

    card.textContent =
        `Booking: ${booking.id} | Day: ${booking.selectedDay} | Ticket: ${booking.ticketClass} | Passengers: ${passengerCount}`;

    bookingsList.appendChild(card);
}

async function loadBookings() {
    try {
        bookingsStatus.textContent = 'Loading bookings...';

        const response = await fetch('/api/bookings');

        if (!response.ok) {
            bookingsStatus.textContent =
                `Unable to load bookings (HTTP ${response.status}).`;
            return;
        }

        const data = await response.json();
        const bookings = Array.isArray(data)
            ? data
            : data.bookings;

        if (!Array.isArray(bookings)) {
            throw new Error('Invalid bookings response.');
        }

        const totalItems = data.pagination
            ? data.pagination.totalItems
            : bookings.length;

        bookingsList.replaceChildren();
        bookings.forEach(displayBooking);

        if (totalItems === 0) {
            bookingsStatus.textContent = 'No bookings yet.';
        } else if (bookings.length < totalItems) {
            bookingsStatus.textContent =
                `Showing ${bookings.length} of ${totalItems} bookings.`;
        } else {
            bookingsStatus.textContent =
                `Found ${totalItems} booking(s).`;
        }
    } catch (error) {
        console.error('Failed to load bookings:', error);
        bookingsStatus.textContent = 'Unable to connect to the server.';
    }
}

loadBookings();
