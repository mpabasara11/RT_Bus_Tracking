const serverless = require('serverless-http');
const app = require('../app');
const connectToDb = require('../db');

module.exports.handler = async (req, res) => {
    await connectToDb(); // ensure DB connection
    return serverless(app)(req, res);
};
