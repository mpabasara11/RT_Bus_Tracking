const mongoose = require('mongoose');

// route schema
const scheduleSchema = new mongoose.Schema({
    scheduleId: String,
    busId: String,
    routeNumber: String,
    day: String,
    distance: String,
    confirmationStatus:String 
    // other fields if needed...
    });
        
// Create a User model from the schema
module.exports=mongoose.model('Schedule', scheduleSchema);


