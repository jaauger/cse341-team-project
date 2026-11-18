import {
    createUser,
    findUserByEmail,
    hashPassword,
    verifyPassword
} from '../models/users.js';

import Role from '../models/schemas/roles.js';

const register = async (req, res) => {
    try {
        const { displayName, username, email, password } = req.body;

        // Validate required fields.
        if (
            !displayName?.trim() ||
            !username?.trim() ||
            !email?.trim() ||
            typeof password !== 'string' ||
            password.length < 8
        ) {
            return res.status(400).json({
                message: 'All fields are required. Password must be at least 8 characters.'
            });
        }

        // Check whether the email is already registered.
        const existingUser = await findUserByEmail(email.trim());

        if (existingUser) {
            return res.status(409).json({
                message: 'An account with this email already exists.'
            });
        }

        // New registrations always receive the customer role.
        const customerRole = await Role.findOne({ name: 'customer' });

        if (!customerRole) {
            return res.status(500).json({
                message: 'Registration is currently unavailable.'
            });
        }

        // Hash the password before storing it.
        const passwordHash = await hashPassword(password);

        const user = await createUser({
            displayName: displayName.trim(),
            username: username.trim(),
            email: email.trim().toLowerCase(),
            passwordHash,
            role: customerRole._id
        });

        return res.status(201).json({
            message: 'Registration successful.',
            user: {
                id: user._id,
                displayName: user.displayName,
                username: user.username,
                email: user.email,
                role: 'customer'
            }
        });

    } catch (error) {
        console.error('Registration error:', error);

        if (error.code === 11000) {
            return res.status(409).json({
                message: 'Username or email is already registered.'
            });
        }

        return res.status(500).json({
            message: 'Unable to complete registration.'
        });
    }
};

const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (typeof email !== 'string' || typeof password !== 'string') {
            return res.status(400).json({
                message: 'Email and password are required.'
            });
        }

        // Find the user and retrieve their role.
        const user = await findUserByEmail(email.trim());

        if (!user) {
            return res.status(401).json({
                message: 'Invalid email or password.'
            });
        }

        // Verify the password against the stored hash.
        const passwordMatches = await verifyPassword(
            password,
            user.passwordHash
        );

        if (!passwordMatches) {
            return res.status(401).json({
                message: 'Invalid email or password.'
            });
        }

        // Regenerate the session after successful authentication.
        req.session.regenerate((error) => {
            if (error) {
                console.error('Session regeneration failed:', error);

                return res.status(500).json({
                    message: 'Unable to complete login.'
                });
            }

            // Store only the information needed for authentication.
            req.session.user = {
                id: user._id.toString(),
                displayName: user.displayName,
                role: user.role.name
            };

            req.session.save((saveError) => {
                if (saveError) {
                    console.error('Session save failed:', saveError);

                    return res.status(500).json({
                        message: 'Unable to complete login.'
                    });
                }

                return res.status(200).json({
                    message: 'Login successful.',
                    user: req.session.user
                });
            });
        });

    } catch (error) {
        console.error('Login error:', error);

        return res.status(500).json({
            message: 'Unable to complete login.'
        });
    }
};

const logout = (req, res) => {
    // Destroy the user's session.
    req.session.destroy((error) => {
        if (error) {
            console.error('Logout error:', error);

            return res.status(500).json({
                message: 'Unable to complete logout.'
            });
        }

        // Remove the session cookie from the browser.
        res.clearCookie('connect.sid', {
            path: '/'
        });

        return res.status(200).json({
            message: 'Logout successful.'
        });
    });
};

export { register, login, logout };