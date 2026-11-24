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

    if (!listEl || !templateEl) return;

    // Track the current page and number of trains per page.
    let currentPage = 1;
    const itemsPerPage = 10;

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
            `Showing ${firstItem}–${lastItem} of ${pagination.totalItems} trains`;

        pageInfoEl.textContent =
            `Page ${currentPage} of ${Math.max(1, pagination.totalPages)}`;

        previousEl.disabled = !pagination.hasPreviousPage;
        nextEl.disabled = !pagination.hasNextPage;

        paginationEl.hidden = pagination.totalPages <= 1;
        emptyEl.hidden = trainCount > 0;
    };

    // Request a specific page from the API.
    const loadTrains = async (page = 1) => {
        loadingEl.hidden = false;
        errorEl.hidden = true;
        emptyEl.hidden = true;

        previousEl.disabled = true;
        nextEl.disabled = true;

        try {
            const response = await fetch(
                `/api/trains?page=${page}&limit=${itemsPerPage}`
            );

            if (!response.ok) {
                throw new Error(`Failed to load trains (${response.status})`);
            }

            const payload = await response.json();
            const trains = payload.trains || [];

            renderTrains(trains);
            updatePagination(payload.pagination, trains.length);

        } catch (error) {
            listEl.replaceChildren();
            summaryEl.textContent = '';
            paginationEl.hidden = true;

            errorEl.hidden = false;
            errorEl.textContent =
                'Unable to load trains right now. Please try again in a moment.';

        } finally {
            loadingEl.hidden = true;
        }
    };

    // Handle pagination button clicks.
    previousEl.addEventListener('click', () => {
        if (currentPage > 1) {
            loadTrains(currentPage - 1);
        }
    });

    nextEl.addEventListener('click', () => {
        loadTrains(currentPage + 1);
    });

    // Load the first page when the catalog opens.
    loadTrains();
};

document.addEventListener('DOMContentLoaded', hookTrainsCatalog);