
import bcrypt from 'bcrypt';
import User from './schemas/users.js';

const createUser = async (userData) => {
    return await User.create(userData);
};

const findUserByEmail = async (email) => {
    return await User.findOne({ email: email.toLowerCase() })
        .populate('role');
};

const hashPassword = async (password) => {
    const saltRounds = 12;
    return await bcrypt.hash(password, saltRounds);
};

const verifyPassword = async (password, passwordHash) => {
    return await bcrypt.compare(password, passwordHash);
};

export { createUser, findUserByEmail,
         hashPassword, verifyPassword
 };