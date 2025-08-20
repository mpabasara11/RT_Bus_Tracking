const mongoose = require('mongoose');

// route schema
const routeSchema = new mongoose.Schema({
    routeNumber: String,
    routeName: String,
    day: String,
    departureTime: String,
    arrivalTime: String 
    // other fields if needed...
    });
        
// Create a User model from the schema
module.exports=mongoose.model('Route', routeSchema);




   