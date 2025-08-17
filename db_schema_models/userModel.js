const mongoose = require('mongoose');

// user schema
const userSchema = new mongoose.Schema({
    userName: String,
    passwordHashCode: String,
    userRole: String,
    firstName: String,
    lastName: String,
    email: String,
    nic: String,
    // other fields if needed...
    });
        
// Create a User model from the schema
module.exports=mongoose.model('User', userSchema);
   