const firstDaySelect = document.getElementById('day1');
const secondDaySelect = document.getElementById('day2');
const comparisonStatus = document.getElementById('comparison-status');
const comparisonResults = document.getElementById('comparison-results');
const ticketTemplate = document.getElementById('ticket-class-template');

function displayDay(dayData, container) {
    const section = document.createElement('section');
    const heading = document.createElement('h2');
    const list = document.createElement('ul');

    heading.textContent = `Available on ${dayData.day}`;

    if (dayData.ticketClasses.length === 0) {
        const item = document.createElement('li');
        item.textContent = 'No ticket classes available.';
        list.appendChild(item);
    }

    dayData.ticketClasses.forEach((ticket) => {
        const card = ticketTemplate.content.cloneNode(true);

        card.querySelector('.ticket-class-name').textContent = ticket.name;
        card.querySelector('.ticket-class-price').textContent =
            ` — ${ticket.pricePerKm} per km`;

        list.appendChild(card);
    });

    section.append(heading, list);
    container.appendChild(section);
}

async function loadComparison() {
    comparisonStatus.textContent = 'Loading comparison...';

    try {
        const day1 = firstDaySelect.value;
        const day2 = secondDaySelect.value;

        const response = await fetch(
            `/api/ticket-classes/compare?day1=${encodeURIComponent(day1)}&day2=${encodeURIComponent(day2)}`
        );

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const comparison = await response.json();
        const fragment = document.createDocumentFragment();

        displayDay(comparison.day1, fragment);
        displayDay(comparison.day2, fragment);

        comparisonResults.replaceChildren(fragment);
        comparisonStatus.textContent = 'Comparison loaded.';
    } catch (error) {
        console.error('Comparison failed:', error);
        comparisonResults.replaceChildren();
        comparisonStatus.textContent = 'Unable to load comparison.';
    }
}

firstDaySelect.addEventListener('change', loadComparison);
secondDaySelect.addEventListener('change', loadComparison);

loadComparison();
