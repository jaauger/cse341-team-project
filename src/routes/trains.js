import { getDb } from '../db/connect.js';

const MAX_LIMIT = 50;

const trainsPage = (req, res) => {
    res.render('trains', { title: 'Trains' });
};

const trainsApi = async (req, res, next) => {
    try {
        // Read pagination parameters and apply defaults.
        const pageParam = req.query.page ?? '1';
        const limitParam = req.query.limit ?? '10';


        const searchParam = req.query.search ?? '';
        const typeParam = req.query.type ?? '';
        const powerSourceParam = req.query.powerSource ?? '';
        const sortByParam = req.query.sortBy ?? 'name';
        const sortOrderParam = req.query.sortOrder ?? 'asc';

        const allowedSortFields = [
            'name',
            'operator',
            'maxSpeedKmh',
            'capacity'
        ];

        const allowedSortOrders = ['asc', 'desc'];

        if (
            typeof searchParam !== 'string' ||
            typeof typeParam !== 'string' ||
            typeof powerSourceParam !== 'string'
        ) {
            return res.status(400).json({
                error: 'Search and filter parameters must be strings.'
            });
        }

        if (!allowedSortFields.includes(sortByParam)) {
            return res.status(400).json({
                error: 'Invalid sort field.',
                allowedFields: allowedSortFields
            });
        }

        if (!allowedSortOrders.includes(sortOrderParam)) {
            return res.status(400).json({
                error: 'Sort order must be asc or desc.'
            });
        }


        // Accept only positive decimal integer strings.
        const isPositiveInteger = (value) =>
            typeof value === 'string' && /^[1-9]\d*$/.test(value);

        if (!isPositiveInteger(pageParam) || !isPositiveInteger(limitParam)) {
            return res.status(400).json({
                error: 'Page and limit must be positive integers.'
            });
        }

        const page = Number(pageParam);
        const limit = Number(limitParam);

        // Validate pagination parameters.
        if (
            !Number.isSafeInteger(page) ||
            page < 1 ||
            !Number.isSafeInteger(limit) ||
            limit < 1 ||
            limit > MAX_LIMIT
        ) {
            return res.status(400).json({
                error: `Page must be a positive integer and limit must be between 1 and ${MAX_LIMIT}.`
            });
        }

        const skip = (page - 1) * limit;

        if (!Number.isSafeInteger(skip)) {
            return res.status(400).json({
                error: 'Requested page is too large.'
            });
        }

        const collection = getDb().collection('trains');

        const search = searchParam.trim();
        const type = typeParam.trim();
        const powerSource = powerSourceParam.trim();

        const filter = {};

        const escapeRegex = (value) =>
            value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

        // Keyword search
        if (search) {
            const searchRegex = {
                $regex: escapeRegex(search),
                $options: 'i'
            };

            filter.$or = [
                { name: searchRegex },
                { operator: searchRegex },
                { type: searchRegex },
                { description: searchRegex }
            ];
        }

        // Train type filter
        if (type) {
            filter.type = {
                $regex: `^${escapeRegex(type)}$`,
                $options: 'i'
            };
        }

        // Power source filter
        if (powerSource) {
            filter.powerSource = {
                $regex: `^${escapeRegex(powerSource)}$`,
                $options: 'i'
            };
        }

        const sortDirection = sortOrderParam === 'desc' ? -1 : 1;

        const sort = {
            [sortByParam]: sortDirection,
            _id: 1
        };

        const totalItems = await collection.countDocuments(filter);

        const totalPages = Math.ceil(totalItems / limit);

        // Retrieve only the requested page of trains.
        const trains = await collection
            .find(filter)
            .sort(sort)
            .skip(skip)
            .limit(limit)
            .toArray();

        // Return train records and pagination metadata.
        return res.json({
            trains,
            pagination: {
                totalItems,
                totalPages,
                currentPage: page,
                itemsPerPage: limit,
                hasNextPage: page < totalPages,
                hasPreviousPage: page > 1 && totalPages > 0
            },
            query: {
                search,
                filters: {
                    type: type || null,
                    powerSource: powerSource || null
                },
                sortBy: sortByParam,
                sortOrder: sortOrderParam
            }
        });
    } catch (error) {
        return next(error);
    }
};

const trainsFiltersApi = async (req, res, next) => {
    try {
        const collection = getDb().collection('trains');

        const [types, powerSources] = await Promise.all([
            collection.distinct('type'),
            collection.distinct('powerSource')
        ]);

        const normalizeOptions = (values) =>
            [...new Set(
                values
                    .filter(value => typeof value === 'string')
                    .map(value => value.trim())
                    .filter(value => value.length > 0)
            )].sort((a, b) => a.localeCompare(b));

        return res.json({
            types: normalizeOptions(types),
            powerSources: normalizeOptions(powerSources)
        });
    } catch (error) {
        return next(error);
    }
};

export { trainsApi, trainsPage, trainsFiltersApi };