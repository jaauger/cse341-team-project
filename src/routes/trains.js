import { getDb } from '../db/connect.js';

const trainsPage = (req, res) => {
    res.render('trains', { title: 'Trains' });
};

const trainsApi = async (req, res, next) => {
    try {
        // Read pagination parameters and apply defaults.
        const pageParam = req.query.page ?? '1';
        const limitParam = req.query.limit ?? '10';

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
            limit > 100
        ) {
            return res.status(400).json({
                error: 'Page must be a positive integer and limit must be between 1 and 100.'
            });
        }

        const skip = (page - 1) * limit;

        if (!Number.isSafeInteger(skip)) {
            return res.status(400).json({
                error: 'Requested page is too large.'
            });
        }

        const collection = getDb().collection('trains');

        // Count all available trains.
        const totalItems = await collection.countDocuments({});
        const totalPages = Math.ceil(totalItems / limit);

        // Retrieve only the requested page of trains.
        const trains = await collection
            .find({})
            .sort({ name: 1, _id: 1 })
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
            }
        });
    } catch (error) {
        return next(error);
    }
};

export { trainsApi, trainsPage };