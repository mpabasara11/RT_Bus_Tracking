const serverless = require('serverless-http');
const app = require('../app');
const connectToDb = require('../db');

// wrap DB connection and export the proper handler
const handler = serverless(async (req, res) => {
    try {
        await connectToDb(); // ensure DB is connected
        return app(req, res); // pass the request to Express
    } catch (err) {
        console.error("Serverless function error:", err);
        res.status(500).send("Internal Server Error");
    }
});

module.exports = { handler }; // must export an object with `handler`
