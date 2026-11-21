import {
    getUsers as findUsers,
    getUserById as findUserById,
    updateUserRole as changeUserRole,
    deleteUser as removeUser
} from '../models/users.js';

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
    try {
        let users;

        if (req.user.role === 'admin') {
            users = await findUsers();
        } else {
            const user = await findUserById(req.user.id);
            users = user ? [user] : [];
        }

        return res.status(200).json(users.map(toPublicUser).filter(Boolean));
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

export { getUsers, updateUserRole, deleteUser };
