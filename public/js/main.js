const hookRegionSorter = () => {
    const regionSelect = document.getElementById('region-filter');
    if (regionSelect) {
        regionSelect.addEventListener('change', () => {
            const selectedRegion = regionSelect.value;
            const url = new URL(window.location.href);

            if (selectedRegion && selectedRegion !== 'all') {
                url.searchParams.set('region', selectedRegion);
            } else {
                url.searchParams.delete('region');
            }
            
            window.location.href = url.toString();
        });
    }
};

const hookSeasonSorter = () => {
    const seasonSelect = document.getElementById('season-filter');
    if (seasonSelect) {
        seasonSelect.addEventListener('change', () => {
            const selectedSeason = seasonSelect.value;
            const url = new URL(window.location.href);

            if (selectedSeason && selectedSeason !== 'all') {
                url.searchParams.set('season', selectedSeason);
            } else {
                url.searchParams.delete('season');
            }
            
            window.location.href = url.toString();
        });
    }
};

const hookTripsCatalog = async () => {
    const listEl = document.querySelector('.routes-grid');
    const templateEl = document.getElementById('route-card-template');
    const regionSelect = document.getElementById('region-filter');
    const seasonSelect = document.getElementById('season-filter');
    const loadingEl = document.getElementById('trips-loading');
    const errorEl = document.getElementById('trips-error');
    const emptyEl = document.getElementById('trips-empty');

    if (!listEl || !templateEl || !regionSelect || !seasonSelect) {
        return;
    }

    try {
        const response = await fetch('/api/trips');
        if (!response.ok) {
            throw new Error(`Failed to load trips (${response.status})`);
        }

        const trips = await response.json();
        if (!Array.isArray(trips)) {
            throw new Error('Trip API response was not an array');
        }

        const regions = [...new Set(trips.map((trip) => trip.region).filter(Boolean))].sort();
        const seasons = [...new Set(trips.map((trip) => trip.bestSeason).filter(Boolean))].sort();
        const addOptions = (select, defaultLabel, values) => {
            const options = [new Option(defaultLabel, 'all')];
            values.forEach((value) => {
                options.push(new Option(`${value.charAt(0).toUpperCase()}${value.slice(1)}`, value));
            });
            select.replaceChildren(...options);
        };

        addOptions(regionSelect, 'All Regions', regions);
        addOptions(seasonSelect, 'Any Season', seasons);

        const pageUrl = new URL(window.location.href);
        const initialRegion = pageUrl.searchParams.get('region');
        const initialSeason = pageUrl.searchParams.get('season');
        if (regions.includes(initialRegion)) {
            regionSelect.value = initialRegion;
        }
        if (seasons.includes(initialSeason)) {
            seasonSelect.value = initialSeason;
        }

        const cards = [];
        const fragment = document.createDocumentFragment();

        trips.forEach((trip) => {
            const card = templateEl.content.cloneNode(true);
            const cardEl = card.querySelector('.route-card');
            const setText = (field, value) => {
                card.querySelector(`[data-field="${field}"]`).textContent = value ?? '';
            };

            if (trip.region) {
                cardEl.classList.add(trip.region);
            }
            setText('name', trip.name);
            setText('region', trip.region);
            setText('startStation', trip.startStation);
            setText('endStation', trip.endStation);
            setText('duration', trip.duration);
            setText('distance', trip.distance);
            setText('description', trip.description);

            const seasonBadge = card.querySelector('[data-field="bestSeason"]');
            if (trip.bestSeason) {
                seasonBadge.textContent = `Best in ${trip.bestSeason}`;
                seasonBadge.classList.add(`season-${trip.bestSeason}`);
            } else {
                seasonBadge.hidden = true;
            }

            const highlights = card.querySelector('[data-field="highlights"]');
            (trip.highlights || []).forEach((highlight) => {
                const tag = document.createElement('span');
                tag.className = 'highlight-tag';
                tag.textContent = highlight;
                highlights.appendChild(tag);
            });
            if (!highlights.childElementCount) {
                highlights.closest('.highlights').hidden = true;
            }

            card.querySelector('[data-field="details-link"]').href =
                `/trips/${encodeURIComponent(trip.id)}`;
            cards.push(cardEl);
            fragment.appendChild(card);
        });

        listEl.replaceChildren(templateEl, fragment);

        const applyFilters = (updateUrl = true) => {
            const selectedRegion = regionSelect.value;
            const selectedSeason = seasonSelect.value;
            let visibleCount = 0;

            cards.forEach((card) => {
                const matchesRegion = selectedRegion === 'all' || card.classList.contains(selectedRegion);
                const matchesSeason = selectedSeason === 'all' ||
                    card.querySelector('[data-field="bestSeason"]').classList.contains(`season-${selectedSeason}`);
                card.hidden = !matchesRegion || !matchesSeason;
                if (!card.hidden) {
                    visibleCount += 1;
                }
            });

            if (emptyEl) {
                emptyEl.hidden = visibleCount > 0;
            }

            if (updateUrl) {
                const url = new URL(window.location.href);
                selectedRegion === 'all'
                    ? url.searchParams.delete('region')
                    : url.searchParams.set('region', selectedRegion);
                selectedSeason === 'all'
                    ? url.searchParams.delete('season')
                    : url.searchParams.set('season', selectedSeason);
                window.history.replaceState(null, '', url);
            }
        };

        regionSelect.addEventListener('change', () => applyFilters());
        seasonSelect.addEventListener('change', () => applyFilters());
        applyFilters(false);

        if (loadingEl) {
            loadingEl.hidden = true;
        }
    } catch (error) {
        console.error('Error loading trips:', error);
        if (loadingEl) {
            loadingEl.hidden = true;
        }
        if (errorEl) {
            errorEl.hidden = false;
            errorEl.textContent = 'Unable to load trips right now. Please try again in a moment.';
        }
    }
};

const hookTrainsCatalog = async () => {
    const listEl = document.getElementById('trains-list');
    const templateEl = document.getElementById('train-card-template');
    const loadingEl = document.getElementById('trains-loading');
    const errorEl = document.getElementById('trains-error');

    if (!listEl || !templateEl) {
        return;
    }

    try {
        const response = await fetch('/api/trains');
        if (!response.ok) {
            throw new Error(`Failed to load trains (${response.status})`);
        }

        const payload = await response.json();
        const trains = payload.trains || [];
        const fragment = document.createDocumentFragment();

        trains.forEach((train) => {
            const card = templateEl.content.cloneNode(true);
            const imageEl = card.querySelector('[data-field="image"]');

            imageEl.src = train.imageUrl;
            imageEl.alt = train.imageAlt || `${train.name} train`;

            card.querySelector('[data-field="name"]').textContent = train.name;
            card.querySelector('[data-field="operator"]').textContent = train.operator;
            card.querySelector('[data-field="type"]').textContent = train.type;
            card.querySelector('[data-field="speed"]').textContent = `${train.maxSpeedKmh} km/h`;
            card.querySelector('[data-field="seats"]').textContent = `${train.capacity} seats`;
            card.querySelector('[data-field="power"]').textContent = train.powerSource;
            card.querySelector('[data-field="description"]').textContent = train.description;
            card.querySelector('[data-field="best-for"]').textContent = train.bestFor;

            fragment.appendChild(card);
        });

        listEl.replaceChildren(fragment);
        if (loadingEl) {
            loadingEl.hidden = true;
        }
    } catch (error) {
        if (loadingEl) {
            loadingEl.hidden = true;
        }
        if (errorEl) {
            errorEl.hidden = false;
            errorEl.textContent = 'Unable to load trains right now. Please try again in a moment.';
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    // hookRegionSorter();
    // hookSeasonSorter();
    hookTripsCatalog();
    hookTrainsCatalog();
});