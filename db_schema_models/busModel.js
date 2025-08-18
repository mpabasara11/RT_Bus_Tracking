const mongoose = require('mongoose');

// bus schema
const busSchema = new mongoose.Schema({
    busId: String,            // unique identifier for the bus
    busNumber: String,        // bus registration number
    operatorUsername: String, // username of the operator (can reference User)
    routeId: String,          // ID of the route the bus is assigned to
    status: Boolean           // active/inactive status
    // other fields if needed...
});

// Create a Bus model from the schema
module.exports = mongoose.model('Bus', busSchema);
