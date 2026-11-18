import express from 'express';
import session from 'express-session';
import Path from 'path';
import { fileURLToPath } from 'url';
import pkg from './package.json' with { type: 'json' };
import globalMiddleware from './src/middleware/global.js';
import { loadSessionUser } from './src/middleware/auth.js';
import routes from './src/routes/router.js';

import swaggerUi from 'swagger-ui-express';
import swaggerSpec from './src/config/swagger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = Path.dirname(__filename);

const app = express();
if (process.env.NODE_ENV === 'production') {
    app.set('trust proxy', 1);
}

// Add version info to res.locals for access in templates.
app.use((req, res, next) => {
    res.locals.appVersion = pkg.version;
    next();
});

// Configure static files and EJS templates.
app.use(express.static(Path.join(__dirname, 'public')));
app.set('view engine', 'ejs');
app.set('views', Path.join(__dirname, 'src/views'));

// Parse JSON and URL-encoded request bodies.
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Configure session management.
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 1000
    }
}));

app.use(globalMiddleware);
app.use(loadSessionUser);
app.use('/', routes);

// Swagger API documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Catch requests that did not match a route.
app.use((req, res, next) => {
    const err = new Error('Page Not Found');
    err.status = 404;
    next(err);
});

// Render the appropriate error page.
app.use((err, req, res, next) => {
    const status = err.status || 500;

    let template = '500';
    let title = 'Server Error';

    if (status === 403) {
        template = '403';
        title = 'Access Denied';
    } else if (status === 404) {
        template = '404';
        title = 'Page Not Found';
    }

    const context = {
        title,
        error: status === 500 ? 'An unexpected error occurred.' : err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    };

    return res.status(status).render(`errors/${template}`, context);
});

export default app;
