const mongoose = require('mongoose');

let isConnected = false; // track connection

async function connectToDb() {
    if (isConnected) return; // reuse existing connection

    const uri = process.env.MONGODB_URI;
    if (!uri) {
        throw new Error("MONGODB_URI is not defined in environment variables!");
    }

    try {
        await mongoose.connect(uri, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        isConnected = true;
        console.log("Connected to MongoDB");
    } catch (err) {
        console.error("MongoDB connection error:", err);
        throw err; // throw error so Vercel function fails safely
    }
}

module.exports = connectToDb;
