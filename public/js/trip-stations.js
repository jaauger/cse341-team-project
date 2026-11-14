document.addEventListener('DOMContentLoaded', () => {
    const stationButtons = document.querySelectorAll('[data-station-id]');
    const popup = document.getElementById('station-info-popup');
    const closeButton = document.getElementById('close-station-popup');

    if (!popup || !closeButton) {
        return;
    }

    async function loadStation(stationId) {
        try {
            const response = await fetch(
                `/api/stations/${encodeURIComponent(stationId)}`
            );

            if (!response.ok) {
                throw new Error('Unable to retrieve station information');
            }

            const station = await response.json();

            document.getElementById('station-name-display').textContent =
                station.name;

            document.getElementById('station-prefecture-display').textContent =
                station.prefecture;

            document.getElementById('station-region-display').textContent =
                station.region;

            document.getElementById('station-facilities-display').textContent =
                (station.facilities || []).join(', ');

            document.getElementById('station-description-display').textContent =
                station.description;

            popup.hidden = false;
        } catch (error) {
            console.error('Station information error:', error);
            alert('Unable to load station information.');
        }
    }

    stationButtons.forEach((button) => {
        button.addEventListener('click', () => {
            loadStation(button.dataset.stationId);
        });
    });

    closeButton.addEventListener('click', () => {
        popup.hidden = true;
    });
});