const loadSessionUser = (req, res, next) => {
    // Retrieve the authenticated user from the session.
    req.user = req.session?.user || null;

    // Make the user available to EJS templates.
    res.locals.user = req.user;

    next();
};

const requireApiLogin = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            message: 'Authentication required.'
        });
    }

    return next();
};

const requirePageLogin = (req, res, next) => {
    if (!req.user) {
        return res.redirect('/login');
    }

    return next();
};

const requireApiRole = (role) => {
    return (req, res, next) => {
        // First, verify that the user is logged in.
        if (!req.user) {
            return res.status(401).json({
                message: 'Authentication required.'
            });
        }

        // Next, verify that the user has the required role.
        if (req.user.role !== role) {
            return res.status(403).json({
                message: 'Access denied. Insufficient permissions.'
            });
        }

        return next();
    };
};

const requirePageRole = (role) => {
    return (req, res, next) => {
        // Unauthenticated visitors must log in first.
        if (!req.user) {
            return res.redirect('/login');

        }

        // Authenticated users without permission receive HTTP 403.
        if (req.user.role !== role) {
            const error = new Error('Access denied. Insufficient permissions.');
            error.status = 403;
            return next(error);

        }

        return next();
    };
};

export { loadSessionUser,
         requireApiLogin,
         requirePageLogin,
         requireApiRole,
         requirePageRole
 };