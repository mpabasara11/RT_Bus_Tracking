const serverless = require('serverless-http');
const app = require('../app');
const connectToDb = require('../db');

module.exports.handler = async (req, res) => {
    try {
        await connectToDb();        // ensure DB connected
        return serverless(app)(req, res);
    } catch (err) {
        console.error("Serverless function error:", err);
        res.status(500).send("Internal Server Error");
    }
};
