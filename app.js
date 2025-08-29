const express = require('express');
const app = express();
const cors = require('cors');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcrypt');
const { swaggerUi, swaggerSpec } = require('./swagger');

require('dotenv').config();
const jwtSecret = process.env.JWT_SECRET;

// importing routes
const adminRoutes = require('./route_files/admin.js');
const authenticationRoutes = require('./route_files/auth.js');
const busOperatorRoutes = require('./route_files/busOperator.js');
const commuterRoutes = require('./route_files/commuter.js');

app.use(cors());
app.use(express.json());
app.use(cookieParser());

// middleware for request logging
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// Swagger UI Route
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// connect auth routes
app.use('/auth', authenticationRoutes);

// connect commuter routes
app.use('/commuter', commuterRoutes);

// middleware for cookie verification and token validation
app.use((req, res, next) => {
    if (req.cookies.state_token) {
        console.log('cookie found');

        jwt.verify(req.cookies.state_token, jwtSecret, (error, decodedToken) => {
            if (error) {
                console.log('Invalid token');
                res.status(401).json({ error: 'Invalid token' });
            } else {
                console.log('Token verified');

                // attach token details to request object
                req.userName = decodedToken.userName;
                req.userRole = decodedToken.userRole;
                req.firstName = decodedToken.firstName;
                req.lastName = decodedToken.lastName;
                req.email = decodedToken.email;
                req.nic = decodedToken.nic;

                next();
            }
        });
    } else {
        console.log('cookie not found');
        res.status(401).json({ error: 'cookie not found' });
    }
});

// connect admin routes
app.use('/admin', adminRoutes);

// connect bus operator routes
app.use('/busOperator', busOperatorRoutes);

// Export app for serverless
module.exports = app;
