const hookTrainsCatalog = () => {
    const listEl = document.getElementById('trains-list');
    const templateEl = document.getElementById('train-card-template');
    const loadingEl = document.getElementById('trains-loading');
    const errorEl = document.getElementById('trains-error');
    const emptyEl = document.getElementById('trains-empty');
    const summaryEl = document.getElementById('trains-results-summary');
    const paginationEl = document.getElementById('trains-pagination');
    const previousEl = document.getElementById('trains-prev');
    const nextEl = document.getElementById('trains-next');
    const pageInfoEl = document.getElementById('trains-page-info');

    // Search, filtering, and sorting controls.
    const controlsEl = document.getElementById('trains-controls');
    const searchEl = document.getElementById('trains-search');
    const typeEl = document.getElementById('trains-type');
    const powerSourceEl = document.getElementById('trains-power-source');
    const sortByEl = document.getElementById('trains-sort-by');
    const sortOrderEl = document.getElementById('trains-sort-order');

    if (!listEl || !templateEl || !controlsEl) return;

    // Track pagination and active API requests.
    let currentPage = 1;
    const itemsPerPage = 10;
    let activeRequest = null;

    // Track the currently applied search and filter criteria.
    let activeCriteria = {
        search: '',
        type: '',
        powerSource: '',
        sortBy: 'name',
        sortOrder: 'asc'
    };

    // Read the current values from the form controls.
    const getCriteria = () => ({
        search: searchEl.value.trim(),
        type: typeEl.value,
        powerSource: powerSourceEl.value,
        sortBy: sortByEl.value,
        sortOrder: sortOrderEl.value
    });

    // Populate a dropdown with options returned by the API.
    const populateOptions = (selectEl, values) => {
        const fragment = document.createDocumentFragment();

        values.forEach((value) => {
            const option = document.createElement('option');

            option.value = value;
            option.textContent = value;

            fragment.appendChild(option);
        });

        selectEl.appendChild(fragment);
    };

    // Load available train types and power sources.
    const loadFilterOptions = async () => {
        try {
            const response = await fetch('/api/trains/filters');

            if (!response.ok) {
                throw new Error(
                    `Failed to load filter options (${response.status})`
                );
            }

            const payload = await response.json();

            populateOptions(typeEl, payload.types);
            populateOptions(powerSourceEl, payload.powerSources);

        } catch (error) {
            typeEl.disabled = true;
            powerSourceEl.disabled = true;

            typeEl.options[0].textContent = 'Types unavailable';
            powerSourceEl.options[0].textContent = 'Power sources unavailable';
        }
    };

    // Render the train cards returned by the API.
    const renderTrains = (trains) => {
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
    };

    // Update pagination controls using API metadata.
    const updatePagination = (pagination, trainCount) => {
        currentPage = pagination.currentPage;

        const firstItem = trainCount === 0
            ? 0
            : (currentPage - 1) * pagination.itemsPerPage + 1;

        const lastItem = trainCount === 0
            ? 0
            : firstItem + trainCount - 1;

        summaryEl.textContent =
            `Showing ${firstItem}\u2013${lastItem} of ${pagination.totalItems} trains`;

        pageInfoEl.textContent =
            `Page ${currentPage} of ${Math.max(1, pagination.totalPages)}`;

        previousEl.disabled = !pagination.hasPreviousPage;
        nextEl.disabled = !pagination.hasNextPage;

        paginationEl.hidden = pagination.totalPages <= 1;
        emptyEl.hidden = trainCount > 0;
    };

    // Build the API query using the active criteria.
    const buildQuery = (page) => {
        const params = new URLSearchParams({
            page: String(page),
            limit: String(itemsPerPage),
            sortBy: activeCriteria.sortBy,
            sortOrder: activeCriteria.sortOrder
        });

        if (activeCriteria.search) {
            params.set('search', activeCriteria.search);
        }

        if (activeCriteria.type) {
            params.set('type', activeCriteria.type);
        }

        if (activeCriteria.powerSource) {
            params.set('powerSource', activeCriteria.powerSource);
        }

        return params.toString();
    };

    // Request a specific page using the active criteria.
    const loadTrains = async (page = 1) => {
        // Cancel any previous request that is still running.
        if (activeRequest) {
            activeRequest.abort();
        }

        const controller = new AbortController();
        activeRequest = controller;

        loadingEl.hidden = false;
        errorEl.hidden = true;
        emptyEl.hidden = true;

        previousEl.disabled = true;
        nextEl.disabled = true;

        try {
            const response = await fetch(
                `/api/trains?${buildQuery(page)}`,
                { signal: controller.signal }
            );

            if (!response.ok) {
                throw new Error(`Failed to load trains (${response.status})`);
            }

            const payload = await response.json();

            // Ignore responses from superseded requests.
            if (activeRequest !== controller) return;

            const trains = payload.trains || [];

            renderTrains(trains);
            updatePagination(payload.pagination, trains.length);

        } catch (error) {
            if (
                error.name === 'AbortError' ||
                activeRequest !== controller
            ) {
                return;
            }

            listEl.replaceChildren();
            summaryEl.textContent = '';
            paginationEl.hidden = true;

            errorEl.hidden = false;
            errorEl.textContent =
                'Unable to load trains right now. Please try again in a moment.';

        } finally {
            if (activeRequest === controller) {
                loadingEl.hidden = true;
                activeRequest = null;
            }
        }
    };

    // Apply new criteria and return to the first page.
    const applyCriteria = () => {
        activeCriteria = getCriteria();
        loadTrains(1);
    };

    // Handle Apply button and Enter key submissions.
    controlsEl.addEventListener('submit', (event) => {
        event.preventDefault();
        applyCriteria();
    });

    // Automatically apply dropdown changes.
    [typeEl, powerSourceEl, sortByEl, sortOrderEl].forEach((selectEl) => {
        selectEl.addEventListener('change', applyCriteria);
    });

    // Restore default search, filtering, and sorting criteria.
    controlsEl.addEventListener('reset', (event) => {
        event.preventDefault();

        searchEl.value = '';
        typeEl.value = '';
        powerSourceEl.value = '';
        sortByEl.value = 'name';
        sortOrderEl.value = 'asc';

        applyCriteria();
    });

    // Handle pagination button clicks.
    previousEl.addEventListener('click', () => {
        if (currentPage > 1) {
            loadTrains(currentPage - 1);
        }
    });

    nextEl.addEventListener('click', () => {
        loadTrains(currentPage + 1);
    });

    // Initialize the catalog.
    loadFilterOptions();
    loadTrains();
};

document.addEventListener('DOMContentLoaded', hookTrainsCatalog);