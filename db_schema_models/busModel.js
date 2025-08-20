const mongoose = require('mongoose');

// bus schema
const busSchema = new mongoose.Schema({
    busId: String,            // unique identifier for the bus
    busNumber: String,        // bus registration number
    operatorUsername: String, // username of the operator (can reference User)
    routeId: String,          // ID of the route the bus is assigned to
    workflowStatus: { type:String, default: "pending" },      // active/inactive/pending 
    latitude:{ type:Number, default:0 },              //latitude
    longitude:{ type:Number, default:0 },             //longitude
    locationLastUpdate:{ type:Date, default:Date.now }        //last location updated time stamp
    // other fields if needed...
});

// Create a Bus model from the schema
module.exports = mongoose.model('Bus', busSchema);
