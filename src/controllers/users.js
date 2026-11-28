import {
    getPaginatedUsers as findPaginatedUsers,
    countUsers as countAllUsers,
    getUserById as findUserById,
    updateUserRole as changeUserRole,
    deleteUser as removeUser
} from '../models/users.js';

const MAX_LIMIT = 50;

const toPublicUser = (user) => {
    if (!user) {
        return null;
    }

    const userData = typeof user.toObject === 'function'
        ? user.toObject()
        : user;

    return {
        id: userData._id?.toString(),
        displayName: userData.displayName,
        username: userData.username,
        email: userData.email,
        role: userData.role?.name || null
    };
};

const getUsers = async (req, res) => {
    const pageParam = req.query.page ?? '1';
    const limitParam = req.query.limit ?? '10';
    const sortByParam = req.query.sortBy ?? 'username';
    const sortOrderParam = req.query.sortOrder ?? 'asc';

    const isPositiveInteger = (value) =>
        typeof value === 'string' && /^[1-9]\d*$/.test(value);

    if (!isPositiveInteger(pageParam) || !isPositiveInteger(limitParam)) {
        return res.status(400).json({
            error: 'Page and limit must be positive integers.'
        });
    }

    const page = Number(pageParam);
    const limit = Number(limitParam);

    if (
        !Number.isSafeInteger(page) ||
        !Number.isSafeInteger(limit) ||
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

    const allowedSortFields = ['username'];

    if (!allowedSortFields.includes(sortByParam)) {
        return res.status(400).json({
            error: 'Invalid sort field.',
            allowedFields: allowedSortFields
        });
    }

    const allowedSortOrders = ['asc', 'desc'];

    if (!allowedSortOrders.includes(sortOrderParam)) {
        return res.status(400).json({
            error: 'Sort order must be asc or desc.'
        });
    }

    const sortDirection = sortOrderParam === 'desc' ? -1 : 1;

    try {
        let users;
        let totalItems;

        if (req.user.role === 'admin') {
            [users, totalItems] = await Promise.all([
                findPaginatedUsers({ skip, limit, sortDirection }),
                countAllUsers()
            ]);
        } else {
            const user = await findUserById(req.user.id);
            totalItems = user ? 1 : 0;
            users = user && skip === 0 ? [user] : [];
        }

        const totalPages = Math.ceil(totalItems / limit);

        return res.status(200).json({
            users: users.map(toPublicUser).filter(Boolean),
            pagination: {
                totalItems,
                totalPages,
                currentPage: page,
                itemsPerPage: limit,
                hasNextPage: page < totalPages,
                hasPreviousPage: page > 1 && totalPages > 0
            },
            query: {
                sortBy: sortByParam,
                sortOrder: sortOrderParam
            }
        });
    } catch (error) {
        console.error('Error fetching users:', error);

        return res.status(500).json({
            message: 'Unable to fetch users.'
        });
    }
};

const updateUserRole = async (req, res) => {
    const roleName = req.body?.role;

    if (!['customer', 'admin'].includes(roleName)) {
        return res.status(400).json({
            message: 'Role must be customer or admin.'
        });
    }

    try {
        const user = await changeUserRole(req.params.id, roleName);

        if (!user) {
            return res.status(404).json({
                message: 'User not found.'
            });
        }

        return res.status(200).json(toPublicUser(user));
    } catch (error) {
        if (error.name === 'CastError') {
            return res.status(404).json({
                message: 'User not found.'
            });
        }

        console.error('Error updating user role:', error);

        return res.status(500).json({
            message: 'Unable to update user role.'
        });
    }
};

const deleteUser = async (req, res) => {
    try {
        const user = await removeUser(req.params.id);

        if (!user) {
            return res.status(404).json({
                message: 'User not found.'
            });
        }

        return res.status(204).send();
    } catch (error) {
        if (error.name === 'CastError') {
            return res.status(404).json({
                message: 'User not found.'
            });
        }

        console.error('Error deleting user:', error);

        return res.status(500).json({
            message: 'Unable to delete user.'
        });
    }
};

const getUsersPage = (req, res) => {
    return res.render('users-admin', {
        title: 'User Management',
        isAdmin: req.user.role === 'admin'
    });
};

export { getUsers, updateUserRole, deleteUser, getUsersPage };
