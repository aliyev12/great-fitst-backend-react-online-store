const cookieParser = require('cookie-parser');

require('dotenv').config({ path: '.env' });
const createServer = require('./createServer');
const db = require('./db');

const server = createServer();

// TODO Use express middleware to handle cookies (JWT)
// Allow using any existing express middleware
server.express.use(cookieParset());
// TODO Use express middleware to populate current user

server.start({
    cors: {
        credentials: true,
        origin: process.env.FRONTEND_URL
    }
}, deets => {
    console.log(`Server is now running on port http://localhost:${deets.port}`);
});

/*
Middleware is a function that runs in the middle of request and response
*/