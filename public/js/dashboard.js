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

        const bookings = await response.json();

        bookingsList.replaceChildren();
        bookings.forEach(displayBooking);

        if (bookings.length === 0) {
            bookingsStatus.textContent = 'No bookings yet.';
        } else {
            bookingsStatus.textContent =
                `Found ${bookings.length} booking(s).`;
        }
    } catch (error) {
        console.error('Failed to load bookings:', error);
        bookingsStatus.textContent = 'Unable to connect to the server.';
    }
}

loadBookings();
