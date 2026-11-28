
import bcrypt from 'bcrypt';
import User from './schemas/users.js';
import Role from './schemas/roles.js';

const createUser = async (userData) => {
    return await User.create(userData);
};

const findUserByEmail = async (email) => {
    return await User.findOne({ email: email.toLowerCase() })
        .populate('role');
};

const getUsers = async () => {
    return await User.find({})
        .populate('role');
};

const getPaginatedUsers = async ({ filter = {}, skip, limit, sortDirection }) => {
    return await User.find(filter)
        .collation({ locale: 'en', strength: 2 })
        .sort({ username: sortDirection, _id: 1 })
        .skip(skip)
        .limit(limit)
        .populate('role');
};

const countUsers = async (filter = {}) => {
    return await User.countDocuments(filter);
};

const getUserById = async (id) => {
    return await User.findById(id)
        .populate('role');
};

const updateUserRole = async (id, roleName) => {
    const role = await Role.findOne({ name: roleName });

    if (!role) {
        return null;
    }

    return await User.findByIdAndUpdate(
        id,
        { role: role._id },
        { new: true, runValidators: true }
    ).populate('role');
};

const deleteUser = async (id) => {
    return await User.findByIdAndDelete(id);
};

const hashPassword = async (password) => {
    const saltRounds = 12;
    return await bcrypt.hash(password, saltRounds);
};

const verifyPassword = async (password, passwordHash) => {
    return await bcrypt.compare(password, passwordHash);
};

export { createUser, findUserByEmail,
         getUsers, getPaginatedUsers, countUsers,
         getUserById, updateUserRole, deleteUser,
         hashPassword, verifyPassword
 };