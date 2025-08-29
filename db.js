const mongoose = require('mongoose');

let isConnected = false;

async function connectToDb() {
    if (isConnected) return; // already connected

    const uri = process.env.MONGODB_URI;
    await mongoose.connect(uri);
    isConnected = true;
    console.log("Connected to MongoDB");
}

module.exports = connectToDb;
