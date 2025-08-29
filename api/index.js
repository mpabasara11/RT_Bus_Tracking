const serverless = require('serverless-http');
const app = require('../app');
const connectToDb = require('../db');

// Ensure DB is connected before handling requests
let isDbConnected = false;

app.use(async (req, res, next) => {
    if (!isDbConnected) {
        try {
            await connectToDb();
            isDbConnected = true;
        } catch (err) {
            console.error("DB connection error:", err);
            return res.status(500).send("DB connection failed");
        }
    }
    next();
});

module.exports.handler = serverless(app);
