document.addEventListener('DOMContentLoaded', async () => {
    const tripElement = document.querySelector('.route-detail');
    const schedulesGrid = document.getElementById('schedules-grid');

    const monthButtons = document.querySelectorAll('.month-badge');

    monthButtons.forEach((button) => {
        button.addEventListener('click', () => {
            const selectedMonth = Number(button.dataset.month);

            // Clear the previous selection
            monthButtons.forEach((monthButton) => {
                monthButton.classList.remove('selected');
                monthButton.setAttribute('aria-pressed', 'false');
            });

            // Highlight the newly selected month
            button.classList.add('selected');
            button.setAttribute('aria-pressed', 'true');

            // Retrieve schedules for the selected month
            loadSchedules(selectedMonth);
        });
    });

    if (!tripElement || !schedulesGrid) {
        return;
    }

    const tripId = tripElement.dataset.tripId;

    async function loadSchedules(month) {
        try {
            const url = `/api/trips/${encodeURIComponent(tripId)}/schedules`;

            const requestUrl = month === undefined
                ? url
                : `${url}?month=${month}`;

            const response = await fetch(requestUrl);

            if (!response.ok) {
                throw new Error('Unable to retrieve schedules');
            }

            const schedules = await response.json();

            console.log('Retrieved schedules:', schedules);
            schedulesGrid.innerHTML = '';

            schedules.forEach((schedule) => {
                const card = document.createElement('div');
                card.className = 'schedule-card';

                const departure = document.createElement('p');
                departure.textContent = `Departs: ${schedule.departureTime}`;

                card.appendChild(departure);

                const arrival = document.createElement('p');
                arrival.textContent = `Arrives: ${schedule.arrivalTime}`;

                card.appendChild(arrival);

                const daysContainer = document.createElement('div');
                daysContainer.className = 'schedule-days';

                schedule.daysOfWeek.forEach((day) => {
                    const dayBadge = document.createElement('span');
                    dayBadge.className = 'day-badge';
                    dayBadge.textContent = day.substring(0, 3);

                    daysContainer.appendChild(dayBadge);
                });

                card.appendChild(daysContainer);

                const bookLink = document.createElement('a');

                bookLink.href = `/trips/booking/${schedule.id}`;
                bookLink.className = 'book-btn';
                bookLink.textContent = 'Book Now';

                card.appendChild(bookLink);

                schedulesGrid.appendChild(card);
            });

        } catch (error) {
            console.error('Schedules error:', error);
            schedulesGrid.textContent = 'Unable to load schedules.';
        }
    }

    // Initial page load
    loadSchedules();
});