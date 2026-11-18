import { Router } from 'express';

import {
    register,
    login,
    logout
} from '../controllers/auth.js';

import { requireApiLogin } from '../middleware/auth.js';

const router = Router();

// Authentication endpoints
router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);

router.get('/me', requireApiLogin, (req, res) => {
    return res.status(200).json({
        user: req.user
    });
});

export default router;