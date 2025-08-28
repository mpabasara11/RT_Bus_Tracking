const mongoose = require('mongoose');

// route schema
const routeSchema = new mongoose.Schema({
    routeNumber: String,
    routeName: String,
    startLocation: String,
    endLocation: String,
    distance: String,
    status: Boolean
    // other fields if needed...
});

// Create a Route model from the schema
module.exports = mongoose.model('Route', routeSchema);
