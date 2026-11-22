const tripList = document.querySelector('#trip-list');
const statusMessage = document.querySelector('#trip-status-message');
const cardTemplate = document.querySelector('#trip-card-template');
const editTemplate = document.querySelector('#trip-edit-template');

let tripsById = new Map();
let stationsById = new Map();
let allStations = [];
let allSchedules = [];

const getErrorMessage = async (response, fallback) => {
    try {
        const data = await response.json();
        return data.message || fallback;
    } catch {
        return fallback;
    }
};

const formatScheduleLabel = (schedule) => {
    const days = Array.isArray(schedule.daysOfWeek)
        ? schedule.daysOfWeek.map((day) => day.slice(0, 3)).join(', ')
        : '';
    return `#${schedule.id}: ${schedule.departureTime} -> ${schedule.arrivalTime}${days ? ` (${days})` : ''}`;
};

const getStationName = (stationId) => {
    const station = stationsById.get(stationId);
    return station ? station.name : stationId;
};

const getSchedulesForTrip = (tripId) => {
    return allSchedules.filter((schedule) => schedule.tripId === tripId);
};

const renderTrips = () => {
    if (tripsById.size === 0) {
        const emptyMsg = document.createElement('p');
        emptyMsg.textContent = 'No trips found.';
        tripList.replaceChildren(emptyMsg);
        return;
    }

    const fragment = document.createDocumentFragment();

    for (const trip of tripsById.values()) {
        const clone = cardTemplate.content.cloneNode(true);
        const card = clone.querySelector('.trip-card');
        const assignedSchedules = getSchedulesForTrip(trip.id);

        card.dataset.tripId = trip.id;
        card.querySelector('.trip-name').textContent = trip.name;
        card.querySelector('.trip-description').textContent = trip.description || '';
        card.querySelector('.trip-start').textContent = getStationName(trip.startStation);
        card.querySelector('.trip-end').textContent = getStationName(trip.endStation);
        card.querySelector('.trip-meta').textContent =
            `${trip.region} | ${trip.duration} | ${trip.distance} km` +
            (trip.bestSeason ? ` | Best Season: ${trip.bestSeason}` : '');
        card.querySelector('.trip-months').textContent = Array.isArray(trip.operatingMonths)
            ? trip.operatingMonths.join(', ')
            : 'None';
        card.querySelector('.trip-schedules').textContent = assignedSchedules.length > 0
            ? assignedSchedules.map(formatScheduleLabel).join(' | ')
            : 'None';

        fragment.append(clone);
    }

    tripList.replaceChildren(fragment);
};

const populateStationSelect = (selectEl, selectedStationId) => {
    for (const station of allStations) {
        const option = document.createElement('option');
        option.value = station.id;
        option.textContent = station.name;
        option.selected = station.id === selectedStationId;
        selectEl.append(option);
    }
};

const populateScheduleSelect = (selectEl, tripId) => {
    for (const schedule of allSchedules) {
        const option = document.createElement('option');
        option.value = String(schedule.id);
        const currentOwner = schedule.tripId && schedule.tripId !== tripId && schedule.tripId !== 'unassigned'
            ? ` [currently: ${schedule.tripId}]`
            : '';
        option.textContent = `${formatScheduleLabel(schedule)}${currentOwner}`;
        option.selected = schedule.tripId === tripId;
        selectEl.append(option);
    }
};

const saveTrip = async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const tripId = form.dataset.tripId;

    const operatingMonths = form.elements.operatingMonths.value
        .split(',')
        .map((val) => Number(val.trim()))
        .filter((num) => Number.isInteger(num) && num >= 1 && num <= 12);

    const scheduleIds = Array.from(form.elements.schedules.selectedOptions).map(
        (option) => Number(option.value)
    );

    const payload = {
        name: form.elements.name.value.trim(),
        description: form.elements.description.value.trim(),
        startStation: form.elements.startStation.value,
        endStation: form.elements.endStation.value,
        region: form.elements.region.value.trim(),
        duration: form.elements.duration.value.trim(),
        distance: Number(form.elements.distance.value),
        bestSeason: form.elements.bestSeason.value.trim(),
        operatingMonths,
        scheduleIds
    };

    try {
        const response = await fetch(`/api/trips/${encodeURIComponent(tripId)}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            statusMessage.textContent = await getErrorMessage(response, 'Unable to update trip.');
            return;
        }

        const updatedTrip = await response.json();
        tripsById.set(updatedTrip.id, updatedTrip);

        // Refresh schedules list from API so reassigned schedules display accurately
        const schedulesRes = await fetch('/api/schedules');
        if (schedulesRes.ok) {
            allSchedules = await schedulesRes.json();
        }

        renderTrips();
        statusMessage.textContent = `Updated "${updatedTrip.name}".`;
    } catch (error) {
        console.error('Update trip request failed:', error);
        statusMessage.textContent = 'Network error while updating trip.';
    }
};

const showEditor = (card, trip) => {
    const editor = editTemplate.content.cloneNode(true);
    const form = editor.querySelector('.trip-edit-form');

    form.dataset.tripId = trip.id;
    form.elements.name.value = trip.name || '';
    form.elements.description.value = trip.description || '';
    form.elements.region.value = trip.region || '';
    form.elements.duration.value = trip.duration || '';
    form.elements.distance.value = trip.distance ?? '';
    form.elements.bestSeason.value = trip.bestSeason || '';
    form.elements.operatingMonths.value = Array.isArray(trip.operatingMonths)
        ? trip.operatingMonths.join(', ')
        : '';

    populateStationSelect(form.elements.startStation, trip.startStation);
    populateStationSelect(form.elements.endStation, trip.endStation);
    populateScheduleSelect(form.elements.schedules, trip.id);

    form.addEventListener('submit', saveTrip);
    card.replaceWith(editor);
    form.elements.name.focus();
};

const deleteTrip = async (trip) => {
    const confirmed = window.confirm(`Are you sure you want to delete "${trip.name}"?`);
    if (!confirmed) return;

    try {
        const response = await fetch(`/api/trips/${encodeURIComponent(trip.id)}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            statusMessage.textContent = await getErrorMessage(response, 'Unable to delete trip.');
            return;
        }

        tripsById.delete(trip.id);

        const schedulesRes = await fetch('/api/schedules');
        if (schedulesRes.ok) {
            allSchedules = await schedulesRes.json();
        }

        renderTrips();
        statusMessage.textContent = `Deleted "${trip.name}".`;
    } catch (error) {
        console.error('Delete trip request failed:', error);
        statusMessage.textContent = 'Network error while deleting trip.';
    }
};

tripList.addEventListener('click', async (event) => {
    const button = event.target.closest('button[data-action]');
    if (!button) return;

    const container = button.closest('[data-trip-id]');
    if (!container) return;

    const trip = tripsById.get(container.dataset.tripId);
    const { action } = button.dataset;

    if (action === 'edit' && trip) {
        showEditor(container, trip);
    } else if (action === 'cancel') {
        renderTrips();
    } else if (action === 'delete' && trip) {
        await deleteTrip(trip);
    }
});

const initTripAdmin = async () => {
    try {
        const [tripsRes, stationsRes, schedulesRes] = await Promise.all([
            fetch('/api/trips'),
            fetch('/api/stations'),
            fetch('/api/schedules')
        ]);

        if (!tripsRes.ok) {
            throw new Error('Unable to load trips from the API.');
        }

        const trips = await tripsRes.json();
        allStations = stationsRes.ok ? await stationsRes.json() : [];
        allSchedules = schedulesRes.ok ? await schedulesRes.json() : [];

        tripsById = new Map(trips.map((trip) => [trip.id, trip]));
        stationsById = new Map(allStations.map((station) => [station.id, station]));

        renderTrips();
    } catch (error) {
        console.error('Failed to initialize trip admin page:', error);
        statusMessage.textContent = error.message || 'Failed to load trip data.';
    }
};

initTripAdmin();