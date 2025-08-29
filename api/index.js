const serverless = require('serverless-http');
const app = require('../app');
const connectToDb = require('../db');

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

const handler = serverless(app);

module.exports = handler; // ✅ export the function directly
