const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
require('dotenv').config({ path: '.env' });
const createServer = require('./createServer');
const db = require('./db');

const server = createServer();

// TODO Use express middleware to handle cookies (JWT)
// Allow using any existing express middleware
server.express.use(cookieParser());

// Decode the JWT so we can get the user ID on each erquest
server.express.use((req, res, next) => {
    const {token} = req.cookies;
    if(token) {
        const {userId} = jwt.verify(token, process.env.APP_SECRET);
        // Put the userId onto the req for future requests to access
        req.userId = userId;
    }
    next();
});


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

/*
Creating queries/mutations:

1. Add it to the schema;
2. Add a resolver whether its a Mutation or a Query
3. Build an interface in the front end
*/