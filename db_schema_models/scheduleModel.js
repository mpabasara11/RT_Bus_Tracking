const mongoose = require('mongoose');

// route schema
const scheduleSchema = new mongoose.Schema({
    scheduleId: String,
    busId: String,
    routeId: String,
    day: String,
    distance: String,
    status:Boolean 
    // other fields if needed...
    });
        
// Create a User model from the schema
module.exports=mongoose.model('Schedule', scheduleSchema);


