const express = require('express')
const app = express()
const cors = require('cors');
const helmet = require('helmet');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
//const bcrypt = require('bcrypt');
const { swaggerUi, swaggerSpec } = require('./swagger');



require('dotenv').config();
const jwtSecret = process.env.JWT_SECRET;
const mongouri = process.env.MONGODB_URI;
const port = process.env.PORT || 8080

//importing routes
const adminRoutes = require('./route_files/admin.js')
const authenticationRoutes = require('./route_files/auth.js')
const busOperatorRoutes = require('./route_files/busOperator.js')
const commuterRoutes = require('./route_files/commuter.js')


//app.use(helmet()); // Use Helmet to enhance API's security  //had to disable it due to some issues with swagger ui






app.use(cors()); // Enable CORS for all routes
app.use(express.json());
app.use(cookieParser());


//  middleware for request logging
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

///////////////////////////////////////// swagger static html handling /////////////////////////

const path = require('path');

// Serve raw OpenAPI spec
app.get('/swagger.json', (req, res) => {
    res.json(swaggerSpec);
});

// Serve Swagger UI HTML
app.get('/api-docs', (req, res) => {
    res.sendFile(path.join(__dirname, 'swagger.html'));
});


/////////////////////////////////////////////////////////////////////////////////////////


// Swagger UI Route
//app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));



//connect auth routes 
app.use('/auth', authenticationRoutes);

//connect commuter routes 
app.use('/commuter', commuterRoutes);



//middleware for cookie verification and tokel validation
app.use((req, res, next) => {

    //check if state_token cookie is present
    if (req.cookies.state_token) {
        console.log('cookie found');

        //verify the token
        jwt.verify(req.cookies.state_token, jwtSecret, (error, decodedToken) => {
            if (error) {
                console.log('Invalid token');
                res.status(401).json({ error: 'Invalid token' });
                //  next();
            }
            else {
                console.log('Token verified');

                //check the detail inside token and put them inside request object

                req.userName = decodedToken.userName;
                req.userRole = decodedToken.userRole;
                req.firstName = decodedToken.firstName;
                req.lastName = decodedToken.lastName;
                req.email = decodedToken.email;
                req.nic = decodedToken.nic;

                next();


            }
        });
    }
    else {
        console.log('cookie not found');
        res.status(401).json({ error: 'cookie not found' });


    }

});


//connect admin routes 
app.use('/admin', adminRoutes);

//connect bus operator routes 
app.use('/busOperator', busOperatorRoutes);



connectToDb();


//////////////////////////////////////////////////////////////   Function definitions ///////////////////////////////////////////////////////////////////////////////


//entablish the connection with database
async function connectToDb() {
    // const uri = "mongodb+srv://mpabasara11:zxasd@cluster0.sktjibw.mongodb.net/RtBusTrackingApi?retryWrites=true&w=majority";

    try {
        await mongoose.connect(mongouri);
        console.log("Connected to mongoDB");
        startServer();
    }
    catch (error) {
        console.error(error);


    }


}


function startServer() {
    app.listen(port, () => {
        console.log(`Server is running on port: ${port}`);
    });
}