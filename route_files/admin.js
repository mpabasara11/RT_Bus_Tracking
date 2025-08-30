const express = require('express')
const router = express.Router()
//const mongoose = require('mongoose')
const User = require('../db_schema_models/userModel.js');
const Route = require('../db_schema_models/routeModel.js');
const Bus = require('../db_schema_models/busModel.js');
const Schedule = require('../db_schema_models/scheduleModel.js');
const bcrypt = require('bcrypt');
const Joi = require('joi');


//middleware for checking request object contain a userRole as admin
router.use((req, res, next) => {
    if (req.userRole === 'admin') {
        next();
    }
    else {
        res.status(403).json({ error: 'Forbidden' });

    }
}
)




/**
 * @swagger
 * tags:
 *   name: Admin
 *   description: Admin APIs to manage users, routes, buses, and schedules
 */




////////////////////////////////User Management //////////////////////////////////////

/**
 * @swagger
 * /admin/users:
 *   post:
 *     summary: Create a new user
 *     description: Creates a new user with the provided details. Validates input, hashes the password, and saves the user to the database.
 *     tags: [Admin]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userName
 *               - password
 *               - userRole
 *               - firstName
 *               - lastName
 *               - email
 *               - nic
 *               - status
 *             properties:
 *               userName:
 *                 type: string
 *                 example: johndoe123
 *               password:
 *                 type: string
 *                 example: mysecurepassword
 *               userRole:
 *                 type: string
 *                 enum: [admin, busOperator]
 *                 example: admin
 *               firstName:
 *                 type: string
 *                 example: John
 *               lastName:
 *                 type: string
 *                 example: Doe
 *               email:
 *                 type: string
 *                 format: email
 *                 example: johndoe@example.com
 *               nic:
 *                 type: string
 *                 example: 123456789V
 *               status:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       201:
 *         description: User created successfully
 *         content:
 *           application/json:
 *             example:
 *               message: User created
 *               newUser:
 *                userName: johndoe123
 *                userRole: admin
 *                firstName: John
 *                lastName: Doe
 *                email: johndoe@example.com
 *                nic: 123456789V
 *                status: true
 * 
 *       400:
 *         description: Validation error (invalid input fields)
 *       409:
 *         description: Conflict (username, email, or NIC already exists)
 *       500:
 *         description: Internal server error
 */


//create user
router.post('/users', (req, res) => {

    // Joi schema for validation
    const userSchema = Joi.object({
        userName: Joi.string().alphanum().min(3).max(30).required(),
        password: Joi.string().min(6).required(),
        userRole: Joi.string().valid('admin', 'busOperator').required(),
        firstName: Joi.string().required(),
        lastName: Joi.string().required(),
        email: Joi.string().email().required(),
        nic: Joi.string().min(10).max(12).required(),
        status: Joi.boolean().required()
    });

    // Validate request body
    const { error, value } = userSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    // Destructure validated values
    const { userName, password, userRole, firstName, lastName, email, nic, status } = value;

    // Hash the password
    const saltRounds = 10;
    const passwordHashCode = bcrypt.hashSync(password, saltRounds);

    // Check if username, email, or NIC already exists
    User.findOne({ $or: [{ userName }, { email }, { nic }] })
        .then(user => {
            if (user) {
                // Determine which field is already taken
                if (user.userName === userName) {
                    return res.status(409).json({ error: 'Username already exists' });
                }
                if (user.email === email) {
                    return res.status(409).json({ error: 'Email already exists' });
                }
                if (user.nic === nic) {
                    return res.status(409).json({ error: 'NIC already exists' });
                }
            }

            // Create new user
            const newUser = new User({
                userName,
                passwordHashCode,
                userRole,
                firstName,
                lastName,
                email,
                nic,
                status
            });

            // Save to DB
            newUser.save()
                .then(() => {
                    console.log('User created');
                    res.status(201).json({ message: 'User created', newUser });
                })
                .catch(error => {
                    console.error('Error while saving the user:', error);
                    res.status(500).json({ error: 'Internal server error' });
                });
        })
        .catch(error => {
            console.error('Error while checking existing users:', error);
            res.status(500).json({ error: 'Internal server error' });
        });
});


/**
 * @swagger
 * /admin/users/{userName}:
 *   put:
 *     summary: Update a user's details
 *     description: Updates the details of a user identified by their userName. Validates input, hashes the password, and saves changes to the database.
 *     tags: [Admin]
 *     parameters:
 *       - in: path
 *         name: userName
 *         schema:
 *           type: string
 *         required: true
 *         description: The userName of the user to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - password
 *               - userRole
 *               - firstName
 *               - lastName
 *               - email
 *               - nic
 *               - status
 *             properties:
 *               password:
 *                 type: string
 *                 example: newpassword123
 *               userRole:
 *                 type: string
 *                 enum: [admin, busOperator]
 *                 example: busOperator
 *               firstName:
 *                 type: string
 *                 example: Jane
 *               lastName:
 *                 type: string
 *                 example: Doe
 *               email:
 *                 type: string
 *                 format: email
 *                 example: janedoe@example.com
 *               nic:
 *                 type: string
 *                 example: 987654321V
 *               status:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       200:
 *         description: User updated successfully
 *         content:
 *           application/json:
 *             example:
 *               message: User updated
 *       400:
 *         description: Validation error (invalid input fields)
 *       404:
 *         description: User not found
 *       409:
 *         description: Conflict (email or NIC already exists)
 *       500:
 *         description: Internal server error
 */


//update user details by userName
router.put('/users/:userName', (req, res) => {
    const userNameParam = req.params.userName;

    // Joi schema for updating a user
    const userSchema = Joi.object({
        password: Joi.string().min(6).required(),
        userRole: Joi.string().valid('admin', 'busOperator').required(),
        firstName: Joi.string().required(),
        lastName: Joi.string().required(),
        email: Joi.string().email().required(),
        nic: Joi.string().min(10).max(12).required(),
        status: Joi.boolean().required()
    });

    // Validate request body
    const { error, value } = userSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    // Destructure validated values
    const { password, userRole, firstName, lastName, email, nic, status } = value;

    // Hash the password
    const passwordHashCode = bcrypt.hashSync(password, 10);

    // Find user by username
    User.findOne({ userName: userNameParam })
        .then(user => {
            if (!user) {
                console.log('User not found');
                return res.status(404).json({ error: 'User not found' });
            }

            // Check if  email, or NIC already exists in other users
            User.findOne({
                $or: [{ email }, { nic }],
                _id: { $ne: user._id }  // exclude current user
            }).then(conflict => {
                if (conflict) {
                    if (conflict.email === email) {
                        return res.status(409).json({ error: 'Email already exists' });
                    }
                    if (conflict.nic === nic) {
                        return res.status(409).json({ error: 'NIC already exists' });
                    }
                }

                // Update user fields
                user.passwordHashCode = passwordHashCode;
                user.userRole = userRole;
                user.firstName = firstName;
                user.lastName = lastName;
                user.email = email;
                user.nic = nic;
                user.status = status;

                // Save updated user
                user.save()
                    .then(() => {
                        console.log('User updated');
                        res.status(200).json({ message: 'User updated' });
                    })
                    .catch(err => {
                        console.error('Error while updating the user:', err);
                        res.status(500).json({ error: 'Internal server error' });
                    });
            }).catch(err => {
                console.error('Error while checking conflicts:', err);
                res.status(500).json({ error: 'Internal server error' });
            });
        }).catch(err => {
            console.error('Error while finding user:', err);
            res.status(500).json({ error: 'Internal server error' });
        });
});


/**
 * @swagger
 * /admin/users/{userName}/status:
 *   patch:
 *     summary: Update a user's status
 *     description: Updates only the status (active/inactive) of a user identified by their userName.
 *     tags: [Admin]
 *     parameters:
 *       - in: path
 *         name: userName
 *         schema:
 *           type: string
 *         required: true
 *         description: The userName of the user to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       200:
 *         description: User status updated successfully
 *         content:
 *           application/json:
 *             example:
 *               message: User status updated successfully
 *       400:
 *         description: Validation error (invalid input)
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */

// update only status of a user by userName
router.patch('/users/:userName/status', (req, res) => {
    const userNameParam = req.params.userName;

    // Joi schema for validation (only status now)
    const userSchema = Joi.object({
        status: Joi.boolean().required()
    });

    // Validate request body
    const { error, value } = userSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const { status } = value;

    // Check if user exists
    User.findOne({ userName: userNameParam })
        .then(user => {
            if (!user) {
                console.log('User not found');
                return res.status(404).json({ error: 'User not found' });
            }

            // Update only status
            user.status = status;

            // Save updated user
            user.save()
                .then(() => {
                    console.log('User status updated successfully');
                    res.status(200).json({ message: 'User status updated successfully' });
                })
                .catch(err => {
                    console.error('Error while saving the user:', err);
                    res.status(500).json({ error: 'Internal server error' });
                });
        })
        .catch(err => {
            console.error('Error while checking user:', err);
            res.status(500).json({ error: 'Internal server error' });
        });
});

/**
 * @swagger
 * /admin/users/{userName}:
 *   delete:
 *     summary: Delete a user
 *     description: Deletes a user identified by their userName from the database.
 *     tags: [Admin]
 *     parameters:
 *       - in: path
 *         name: userName
 *         schema:
 *           type: string
 *         required: true
 *         description: The userName of the user to delete
 *     responses:
 *       200:
 *         description: User deleted successfully
 *         content:
 *           application/json:
 *             example:
 *               message: User deleted
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             example:
 *               error: User not found
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             example:
 *               error: Internal server error
 */


//delete user by userName
router.delete('/users/:userName', (req, res) => {
    const userName = req.params.userName;

    User.findOne({ userName })
        .then(user => {
            if (!user) {
                console.log('User not found');
                return res.status(404).json({ error: 'User not found' });
            }

            user.deleteOne()
                .then(() => {
                    console.log('User deleted');
                    res.status(200).json({ message: 'User deleted' });
                })
                .catch(error => {
                    console.error('Error while deleting the user:', error);
                    res.status(500).json({ error: 'Internal server error' });
                });
        });
});


/**
 * @swagger
 * /admin/users:
 *   get:
 *     summary: Get users with optional filters
 *     description: Retrieves a list of users. You can filter users by userName, userRole, firstName, lastName, nic, or status.
 *     tags: [Admin]
 *     parameters:
 *       - in: query
 *         name: userName
 *         schema:
 *           type: string
 *         description: Filter by userName
 *       - in: query
 *         name: userRole
 *         schema:
 *           type: string
 *           enum: [admin, busOperator]
 *         description: Filter by userRole
 *       - in: query
 *         name: firstName
 *         schema:
 *           type: string
 *         description: Filter by first name
 *       - in: query
 *         name: lastName
 *         schema:
 *           type: string
 *         description: Filter by last name
 *       - in: query
 *         name: nic
 *         schema:
 *           type: string
 *         description: Filter by NIC
 *       - in: query
 *         name: status
 *         schema:
 *           type: boolean
 *         description: Filter by status (true/false)
 *     responses:
 *       200:
 *         description: List of users retrieved successfully
 *         content:
 *           application/json:
 *             example:
 *               - userName: johndoe
 *                 userRole: admin
 *                 firstName: John
 *                 lastName: Doe
 *                 email: johndoe@example.com
 *                 nic: 123456789V
 *                 status: true
 *               - userName: janedoe
 *                 userRole: busOperator
 *                 firstName: Jane
 *                 lastName: Doe
 *                 email: janedoe@example.com
 *                 nic: 987654321V
 *                 status: false
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             example:
 *               error: Internal server error
 */


//get users | filter by userName userRole firstName lastName nic status 
router.get('/users', (req, res) => {

    const { userName, userRole, firstName, lastName, nic, status } = req.query; // read query parameters

    let filter = {};

    if (userName) filter.userName = userName; //use 'userName' inside filter
    if (userRole) filter.userRole = userRole;         //use 'userRole' inside filter
    if (firstName) filter.firstName = firstName;     //use 'firstName' inside filter
    if (lastName) filter.lastName = lastName;       //use 'lastName' inside filter
    if (nic) filter.nic = nic;       // use 'nic' inside filter
    if (status !== undefined) filter.status = status === 'true'; //converts string to boolean //use 'status' inside filter

    User.find(filter)
        .then(users => {
            console.log('Users found');
            res.status(200).json(users);
        })
        .catch(error => {
            console.error('Error while getting all users:', error);
            res.status(500).json({ error: 'Internal server error' });
        });
})



////////////////////////////////Route Management //////////////////////////////////////


/**
 * @swagger
 * /admin/routes:
 *   post:
 *     summary: Create a new bus route
 *     description: Creates a new bus route with the provided details. Validates input and saves the route to the database.
 *     tags: [Admin]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - routeNumber
 *               - routeName
 *               - startLocation
 *               - endLocation
 *               - distance
 *               - status
 *             properties:
 *               routeNumber:
 *                 type: string
 *                 example: R001
 *               routeName:
 *                 type: string
 *                 example: colombo  to gampaha
 *               startLocation:
 *                 type: string
 *                 example: colombo
 *               endLocation:
 *                 type: string
 *                 example: gampaha
 *               distance:
 *                 type: string
 *                 example: 12.5km
 *               status:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       201:
 *         description: Route created successfully
 *         content:
 *           application/json:
 *             example:
 *               message: Route created
 *               newRoute:
 *                routeNumber: R001
 *                routeName: colombo to gampaha
 *                startLocation: colombo
 *                endLocation: gampaha
 *                distance: 12.5km
 *                status: true
 *       400:
 *         description: Validation error (invalid input)
 *       409:
 *         description: Route already exists
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             example:
 *               error: Internal server error
 */


//create bus route
router.post('/routes', (req, res) => {

    // Joi schema for route validation
    const routeSchema = Joi.object({
        routeNumber: Joi.string().required(),
        routeName: Joi.string().required(),
        startLocation: Joi.string().required(),
        endLocation: Joi.string().required(),
        distance: Joi.string().required(),
        status: Joi.boolean().required()
    });

    // Validate request body
    const { error, value } = routeSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    // Destructure validated values
    const { routeNumber, routeName, startLocation, endLocation, distance, status } = value;

    // Check if route already exists
    Route.findOne({ routeNumber })
        .then(route => {
            if (route) {
                console.log('Route already exists');
                return res.status(409).json({ error: 'Route already exists' });
            }

            // Create new route
            const newRoute = new Route({
                routeNumber,
                routeName,
                startLocation,
                endLocation,
                distance,
                status
            });

            newRoute.save()
                .then(() => {
                    console.log('Route created');
                    res.status(201).json({ message: 'Route created', newRoute });
                })
                .catch(error => {
                    console.error('Error while saving the route:', error);
                    res.status(500).json({ error: 'Internal server error' });
                });
        });
});

/**
 * @swagger
 * /admin/routes/{routeNumber}:
 *   put:
 *     summary: Update a bus route's details
 *     description: Updates the details of a bus route identified by its routeNumber.
 *     tags: [Admin]
 *     parameters:
 *       - in: path
 *         name: routeNumber
 *         schema:
 *           type: string
 *         required: true
 *         description: The routeNumber of the bus route to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - routeName
 *               - startLocation
 *               - endLocation
 *               - distance
 *               - status
 *             properties:
 *               routeName:
 *                 type: string
 *                 example: gampaha to colombo
 *               startLocation:
 *                 type: string
 *                 example: colombo
 *               endLocation:
 *                 type: string
 *                 example: gampaha
 *               distance:
 *                 type: string
 *                 example: 12.50km
 *               status:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       200:
 *         description: Route updated successfully
 *         content:
 *           application/json:
 *             example:
 *               message: Route updated
 *       400:
 *         description: Validation error (invalid input)
 *       404:
 *         description: Route not found
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             example:
 *               error: Internal server error
 */


//update bus route details by routeNumber
router.put('/routes/:routeNumber', (req, res) => {
    const routeNumber = req.params.routeNumber;

    // Joi schema for route update
    const routeSchema = Joi.object({
        routeName: Joi.string().required(),
        startLocation: Joi.string().required(),
        endLocation: Joi.string().required(),
        distance: Joi.string().required(),
        status: Joi.boolean().required()
    });

    // Validate request body
    const { error, value } = routeSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const { routeName, startLocation, endLocation, distance, status } = value;

    // Check if route exists
    Route.findOne({ routeNumber })
        .then(route => {
            if (!route) {
                console.log('Route not found');
                return res.status(404).json({ error: 'Route not found' });
            }

            // Update route fields
            route.routeName = routeName;
            route.startLocation = startLocation;
            route.endLocation = endLocation;
            route.distance = distance;
            route.status = status;

            route.save()
                .then(() => {
                    console.log('Route updated');
                    res.status(200).json({ message: 'Route updated' });
                })
                .catch(error => {
                    console.error('Error while updating the route:', error);
                    res.status(500).json({ error: 'Internal server error' });
                });
        });
});


/**
 * @swagger
 * /admin/routes/{routeNumber}/status:
 *   patch:
 *     summary: Update a bus route's status
 *     description: Updates only the status (active/inactive) of a bus route identified by its routeNumber.
 *     tags: [Admin]
 *     parameters:
 *       - in: path
 *         name: routeNumber
 *         schema:
 *           type: string
 *         required: true
 *         description: The routeNumber of the bus route to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       200:
 *         description: Route status updated successfully
 *         content:
 *           application/json:
 *             example:
 *               message: Route status updated successfully
 *       400:
 *         description: Validation error (invalid input)
 *       404:
 *         description: Route not found
 *       500:
 *         description: Internal server error
 */


// update only status of a route by routeNumber
router.patch('/routes/:routeNumber/status', (req, res) => {
    const routeNumber = req.params.routeNumber;

    // Joi schema for validation (only status now)
    const routeSchema = Joi.object({
        status: Joi.boolean().required()
    });

    // Validate request body
    const { error, value } = routeSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const { status } = value;

    // Check if route exists
    Route.findOne({ routeNumber })
        .then(route => {
            if (!route) {
                console.log('Route not found');
                return res.status(404).json({ error: 'Route not found' });
            }

            // Update only status
            route.status = status;

            // Save updated route
            route.save()
                .then(() => {
                    console.log('Route status updated successfully');
                    res.status(200).json({ message: 'Route status updated successfully' });
                })
                .catch(err => {
                    console.error('Error while updating the route status:', err);
                    res.status(500).json({ error: 'Internal server error' });
                });
        })
        .catch(err => {
            console.error('Error while checking route:', err);
            res.status(500).json({ error: 'Internal server error' });
        });
});


/**
 * @swagger
 * /admin/routes/{routeNumber}:
 *   delete:
 *     summary: Delete a bus route
 *     description: Deletes a bus route identified by its routeNumber. Cannot delete if any bus is assigned to this route.
 *     tags: [Admin]
 *     parameters:
 *       - in: path
 *         name: routeNumber
 *         schema:
 *           type: string
 *         required: true
 *         description: The routeNumber of the bus route to delete
 *     responses:
 *       200:
 *         description: Route deleted successfully
 *         content:
 *           application/json:
 *             example:
 *               message: Route deleted
 *       400:
 *         description: Route cannot be deleted because it is assigned to a bus
 *         content:
 *           application/json:
 *             example:
 *               error: Cannot delete route, it is assigned to a bus
 *       404:
 *         description: Route not found
 *         content:
 *           application/json:
 *             example:
 *               error: Route not found
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             example:
 *               error: Internal server error
 */


//delete route by routeNumber
router.delete('/routes/:routeNumber', (req, res) => {

    const routeNumber = req.params.routeNumber;

    Route.findOne({ routeNumber: routeNumber })
        .then(route => {
            if (!route) {
                console.log('Route not found');
                return res.status(404).json({ error: 'Route not found' });
            }

            // Check if any bus is assigned to this route
            Bus.findOne({ routeId: routeNumber })
                .then(bus => {
                    if (bus) {
                        console.log('Cannot delete route, it is assigned to a bus');
                        return res.status(400).json({ error: 'Cannot delete route, it is assigned to a bus' });
                    }

                    // No buses assigned, safe to delete
                    route.deleteOne()
                        .then(() => {
                            console.log('Route deleted');
                            res.status(200).json({ message: 'Route deleted' });
                        })
                        .catch(error => {
                            console.error('Error while deleting the route:', error);
                            res.status(500).json({ error: 'Internal server error' });
                        });
                })
                .catch(error => {
                    console.error('Error while checking buses:', error);
                    res.status(500).json({ error: 'Internal server error' });
                });
        })
        .catch(error => {
            console.error('Error while finding the route:', error);
            res.status(500).json({ error: 'Internal server error' });
        });

});

/**
 * @swagger
 * /admin/routes:
 *   get:
 *     summary: Get bus routes with optional filters
 *     description: Retrieves a list of bus routes. You can filter routes by routeNumber, routeName, startLocation, endLocation, or status.
 *     tags: [Admin]
 *     parameters:
 *       - in: query
 *         name: routeNumber
 *         schema:
 *           type: string
 *         description: Filter by routeNumber
 *       - in: query
 *         name: routeName
 *         schema:
 *           type: string
 *         description: Filter by routeName
 *       - in: query
 *         name: startLocation
 *         schema:
 *           type: string
 *         description: Filter by startLocation
 *       - in: query
 *         name: endLocation
 *         schema:
 *           type: string
 *         description: Filter by endLocation
 *       - in: query
 *         name: status
 *         schema:
 *           type: boolean
 *         description: Filter by status (true/false)
 *     responses:
 *       200:
 *         description: List of bus routes retrieved successfully
 *         content:
 *           application/json:
 *             example:
 *               - routeNumber: R001
 *                 routeName: colombo to gampaha
 *                 startLocation: colombo
 *                 endLocation: gampaha
 *                 distance: 12.5
 *                 status: true
 *               - routeNumber: R002
 *                 routeName: gampaha to colombo
 *                 startLocation: gampaha
 *                 endLocation: colombo
 *                 distance: 12.5
 *                 status: false
 *       404:
 *         description: No routes found
 *         content:
 *           application/json:
 *             example:
 *               error: No routes found
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             example:
 *               error: Internal server error
 */


//get bus routes | filter by routeName routeNumber startLocation endLocation status
router.get('/routes', (req, res) => {
    const { routeNumber, routeName, startLocation, endLocation, status } = req.query; // read query parameters

    let filter = {};

    if (routeNumber) filter.routeNumber = routeNumber; //use 'routeNumber' inside filter
    if (routeName) filter.routeName = routeName;       //use 'routeName' inside filter
    if (startLocation) filter.startLocation = startLocation;       //use 'startLocation' inside filter
    if (endLocation) filter.endLocation = endLocation;       //use 'endLocation' inside filter
    if (status !== undefined) filter.status = status === 'true'; //converts string to boolean //use 'status' inside filter
    Route.find(filter)
        .then(routes => {
            if (routes.length === 0) {
                return res.status(404).json({ error: 'No routes found' });
            }
            res.status(200).json(routes);
        })
        .catch(err => {
            console.error('Error fetching routes:', err);
            res.status(500).json({ error: 'Internal server error' });
        });
});


////////////////////////////////bus management////////////////////////////////////////////

/**
 * @swagger
 * /admin/buses:
 *   post:
 *     summary: Create a new bus
 *     description: Creates a new bus with a unique busId and busNumber, assigns an operator and route, and sets the workflow status.
 *     tags: [Admin]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - busId
 *               - busNumber
 *               - operatorUsername
 *               - routeId
 *               - workflowStatus
 *             properties:
 *               busId:
 *                 type: string
 *                 example: B001
 *               busNumber:
 *                 type: string
 *                 example: ABC-1234
 *               operatorUsername:
 *                 type: string
 *                 example: mpabasara11
 *               routeId:
 *                 type: string
 *                 example: R001
 *               workflowStatus:
 *                 type: string
 *                 enum: [pending, active, inactive]
 *                 example: pending
 *     responses:
 *       201:
 *         description: Bus created successfully
 *         content:
 *           application/json:
 *             example:
 *               message: Bus created successfully
 *               newBus:
 *                busId: B001
 *                busNumber: ABC-1234
 *                operatorUsername: mpabasara12
 *                routeId: R001
 *                workflowStatus: pending
 *                latitude: 0
 *                longitude: 0
 *                lastUpdated: 2024-10-10T10:00:00.000Z
 * 
 *       400:
 *         description: Validation error or operator is admin
 *       404:
 *         description: Operator username or route ID not found
 *       409:
 *         description: Bus ID or bus number already exists
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             example:
 *               error: Internal server error
 */


// create bus
router.post('/buses', (req, res) => {

    // Joi schema for bus validation
    const busSchema = Joi.object({
        busId: Joi.string().required(),
        busNumber: Joi.string().required(),
        operatorUsername: Joi.string().required(),
        routeId: Joi.string().required(),
        workflowStatus: Joi.string().valid('pending', 'active', 'inactive').required()

    });

    // Validate request body
    const { error, value } = busSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const { busId, busNumber, operatorUsername, routeId, workflowStatus } = value;

    // Check if operator exists and is not admin
    User.findOne({ userName: operatorUsername })
        .then(operator => {
            if (!operator) {
                console.log('Operator username not found');
                return res.status(404).json({ error: 'Operator username not found' });
            }

            if (operator.userRole === 'admin') {
                console.log('Cannot assign an admin bus operator');
                return res.status(400).json({ error: 'Cannot assign admin as bus operator' });
            }

            // Check if route exists
            Route.findOne({ routeNumber: routeId })
                .then(route => {
                    if (!route) {
                        console.log('Route ID not found');
                        return res.status(404).json({ error: 'Route ID not found' });
                    }

                    // Check if busId already exists
                    Bus.findOne({ busId })
                        .then(existingBusId => {
                            if (existingBusId) {
                                console.log('Bus ID already exists');
                                return res.status(409).json({ error: 'Bus ID already exists' });
                            }

                            // check if busNumber already exists
                            Bus.findOne({ busNumber })
                                .then(existingBusNumber => {
                                    if (existingBusNumber) {
                                        console.log('Bus number already exists');
                                        return res.status(409).json({ error: 'Bus number already exists' });
                                    }

                                    // Create new bus
                                    const newBus = new Bus({
                                        busId,
                                        busNumber,
                                        operatorUsername,
                                        routeId,
                                        workflowStatus,

                                    });

                                    // Save to DB
                                    newBus.save()
                                        .then(() => {
                                            console.log('Bus created successfully');
                                            res.status(201).json({ message: 'Bus created successfully', newBus });
                                        })
                                        .catch(err => {
                                            console.error('Error while saving the bus:', err);
                                            res.status(500).json({ error: 'Internal server error' });
                                        });
                                });
                        });
                })
                .catch(err => {
                    console.error('Error while checking route:', err);
                    res.status(500).json({ error: 'Internal server error' });
                });
        })
        .catch(err => {
            console.error('Error while checking operator:', err);
            res.status(500).json({ error: 'Internal server error' });
        });
});

/**
 * @swagger
 * /admin/buses/{busId}:
 *   put:
 *     summary: Update a bus
 *     description: Updates the details of a bus identified by its busId.
 *     tags: [Admin]
 *     parameters:
 *       - in: path
 *         name: busId
 *         schema:
 *           type: string
 *         required: true
 *         description: The ID of the bus to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - busNumber
 *               - operatorUsername
 *               - routeId
 *               - workflowStatus
 *             properties:
 *               busNumber:
 *                 type: string
 *                 example: ABC-1234
 *               operatorUsername:
 *                 type: string
 *                 example: mpabasara11
 *               routeId:
 *                 type: string
 *                 example: R001
 *               workflowStatus:
 *                 type: string
 *                 enum: [pending, active, inactive]
 *                 example: active
 *     responses:
 *       200:
 *         description: Bus updated successfully
 *         content:
 *           application/json:
 *             example:
 *               message: Bus updated successfully
 *       400:
 *         description: Validation error or operator is admin
 *       404:
 *         description: Bus, operator, or route not found
 *       409:
 *         description: Bus number already exists
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             example:
 *               error: Internal server error
 */


//update bus by busId
router.put('/buses/:busId', (req, res) => {
    const busIdParam = req.params.busId;

    // Joi schema for validation
    const busSchema = Joi.object({
        busNumber: Joi.string().required(),
        operatorUsername: Joi.string().required(),
        routeId: Joi.string().required(),
        workflowStatus: Joi.string().valid('pending', 'active', 'inactive').required()
    });

    // Validate request body
    const { error, value } = busSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const { busNumber, operatorUsername, routeId, workflowStatus } = value;

    // Check if operator exists and is not admin
    User.findOne({ userName: operatorUsername })
        .then(operator => {
            if (!operator) {
                console.log('Operator username not found');
                return res.status(404).json({ error: 'Operator username not found' });
            }

            if (operator.userRole === 'admin') {
                console.log('Cannot assign an admin bus operator');
                return res.status(400).json({ error: 'Cannot assign admin as bus operator' });
            }

            // Check if route exists
            Route.findOne({ routeNumber: routeId })
                .then(route => {
                    if (!route) {
                        console.log('Route ID not found');
                        return res.status(404).json({ error: 'Route ID not found' });
                    }

                    // Check if bus exists
                    Bus.findOne({ busId: busIdParam })
                        .then(bus => {
                            if (!bus) {
                                console.log('Bus not found');
                                return res.status(404).json({ error: 'Bus not found' });
                            }

                            // Optional: check if another bus has the same busNumber
                            Bus.findOne({ busNumber, _id: { $ne: bus._id } })
                                .then(existingBusNumber => {
                                    if (existingBusNumber) {
                                        console.log('Bus number already exists');
                                        return res.status(409).json({ error: 'Bus number already exists' });
                                    }

                                    // Update bus fields
                                    bus.busNumber = busNumber;
                                    bus.operatorUsername = operatorUsername;
                                    bus.routeId = routeId;
                                    bus.workflowStatus = workflowStatus;

                                    // Save updated bus
                                    bus.save()
                                        .then(() => {
                                            console.log('Bus updated successfully');
                                            res.status(200).json({ message: 'Bus updated successfully' });
                                        })
                                        .catch(err => {
                                            console.error('Error while saving the bus:', err);
                                            res.status(500).json({ error: 'Internal server error' });
                                        });
                                });
                        });
                })
                .catch(err => {
                    console.error('Error while checking route:', err);
                    res.status(500).json({ error: 'Internal server error' });
                });
        })
        .catch(err => {
            console.error('Error while checking operator:', err);
            res.status(500).json({ error: 'Internal server error' });
        });
});

/**
 * @swagger
 * /admin/buses/{busId}/workflowStatus:
 *   patch:
 *     summary: Update a bus's workflow status
 *     description: Updates only the workflowStatus of a bus identified by its busId.
 *     tags: [Admin]
 *     parameters:
 *       - in: path
 *         name: busId
 *         schema:
 *           type: string
 *         required: true
 *         description: The ID of the bus to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - workflowStatus
 *             properties:
 *               workflowStatus:
 *                 type: string
 *                 enum: [pending, active, inactive]
 *                 example: active
 *     responses:
 *       200:
 *         description: Workflow status updated successfully
 *         content:
 *           application/json:
 *             example:
 *               message: Workflow status updated successfully
 *       400:
 *         description: Validation error (invalid workflowStatus)
 *       404:
 *         description: Bus not found
 *       500:
 *         description: Internal server error
 */


// update only workflowStatus of a bus by busId
router.patch('/buses/:busId/workflowStatus', (req, res) => {
    const busIdParam = req.params.busId;

    // Joi schema for validation (only workflowStatus now)
    const busSchema = Joi.object({
        workflowStatus: Joi.string().valid('pending', 'active', 'inactive').required()
    });

    // Validate request body
    const { error, value } = busSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const { workflowStatus } = value;

    // Check if bus exists
    Bus.findOne({ busId: busIdParam })
        .then(bus => {
            if (!bus) {
                console.log('Bus not found');
                return res.status(404).json({ error: 'Bus not found' });
            }

            // Update only workflowStatus
            bus.workflowStatus = workflowStatus;

            // Save updated bus
            bus.save()
                .then(() => {
                    console.log('Workflow status updated successfully');
                    res.status(200).json({ message: 'Workflow status updated successfully' });
                })
                .catch(err => {
                    console.error('Error while saving the bus:', err);
                    res.status(500).json({ error: 'Internal server error' });
                });
        })
        .catch(err => {
            console.error('Error while checking bus:', err);
            res.status(500).json({ error: 'Internal server error' });
        });
});

/**
 * @swagger
 * /admin/buses/{busId}:
 *   delete:
 *     summary: Delete a bus
 *     description: Deletes a bus identified by its busId. Also deletes all schedules associated with the bus.
 *     tags: [Admin]
 *     parameters:
 *       - in: path
 *         name: busId
 *         schema:
 *           type: string
 *         required: true
 *         description: The ID of the bus to delete
 *     responses:
 *       200:
 *         description: Bus and associated schedules deleted successfully
 *         content:
 *           application/json:
 *             example:
 *               message: Bus and associated schedules deleted successfully
 *       404:
 *         description: Bus not found
 *         content:
 *           application/json:
 *             example:
 *               error: Bus not found
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             example:
 *               error: Internal server error
 */


//delete bus with busId
router.delete('/buses/:busId', (req, res) => {
    const busId = req.params.busId;

    Bus.findOne({ busId: busId })
        .then(bus => {
            if (!bus) {
                console.log('Bus not found');
                return res.status(404).json({ error: 'Bus not found' });
            }

            bus.deleteOne()
                .then(() => {
                    console.log('Bus deleted');
                    // res.status(200).json({ message: 'Bus deleted' });



                    // After deleting the bus, delete schedules associated with it
                    Schedule.deleteMany({ busId: busId })
                        .then(() => {
                            console.log('Associated schedules deleted successfully');
                            res.status(200).json({ message: 'Bus and associated schedules deleted successfully' });
                        })
                        .catch(error => {
                            console.error('Bus deleted but failed to delete schedules:', error);
                            res.status(200).json({ message: 'Bus deleted but failed to delete schedules' });
                        });



                })
                .catch(error => {
                    console.error('Error while deleting the bus:', error);
                    res.status(500).json({ error: 'Internal server error' });
                });
        })
        .catch(error => {
            console.error('Error while finding the bus:', error);
            res.status(500).json({ error: 'Internal server error' });
        });
});

/**
 * @swagger
 * /admin/buses:
 *   get:
 *     summary: Get buses with optional filters
 *     description: Retrieves a list of buses. You can filter buses by busId, busNumber, operatorUsername, routeId, or workflowStatus.
 *     tags: [Admin]
 *     parameters:
 *       - in: query
 *         name: busId
 *         schema:
 *           type: string
 *         description: Filter by busId
 *       - in: query
 *         name: busNumber
 *         schema:
 *           type: string
 *         description: Filter by busNumber
 *       - in: query
 *         name: operatorUsername
 *         schema:
 *           type: string
 *         description: Filter by operatorUsername
 *       - in: query
 *         name: routeId
 *         schema:
 *           type: string
 *         description: Filter by routeId
 *       - in: query
 *         name: workflowStatus
 *         schema:
 *           type: string
 *           enum: [pending, active, inactive]
 *         description: Filter by workflowStatus
 *     responses:
 *       200:
 *         description: List of buses retrieved successfully
 *         content:
 *           application/json:
 *             example:
 *               - busId: B001
 *                 busNumber: ABC-1234
 *                 operatorUsername: mpabasara11
 *                 routeId: R001
 *                 workflowStatus: active
 *               - busId: B002
 *                 busNumber: XYZ-5678
 *                 operatorUsername: mpabasara12
 *                 routeId: R002
 *                 workflowStatus: pending
 *       404:
 *         description: No buses found
 *         content:
 *           application/json:
 *             example:
 *               error: No buses found
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             example:
 *               error: Internal server error
 */


// Get buses | filter by busId busNumber, operatorUsername, routeId, workflowStatus
router.get('/buses', (req, res) => {
    const { busId, busNumber, operatorUsername, routeId, workflowStatus } = req.query;

    let filter = {};

    if (busId) filter.busId = busId;
    if (busNumber) filter.busNumber = busNumber;
    if (operatorUsername) filter.operatorUsername = operatorUsername;
    if (routeId) filter.routeId = routeId;
    if (workflowStatus) filter.workflowStatus = workflowStatus;

    Bus.find(filter)
        .then(buses => {
            if (buses.length === 0) {
                return res.status(404).json({ error: 'No buses found' });
            }
            res.status(200).json(buses);
        })
        .catch(err => {
            console.error('Error fetching buses:', err);
            res.status(500).json({ error: 'Internal server error' });
        });
});


//////////////////////////////////////schedule management ////////////////////////////////////////


/**
 * @swagger
 * /admin/schedules:
 *   post:
 *     summary: Create a new schedule
 *     description: Creates a new schedule for a bus on a specific route and day.
 *     tags: [Admin]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - scheduleId
 *               - busId
 *               - routeNumber
 *               - day
 *               - distance
 *             properties:
 *               scheduleId:
 *                 type: string
 *                 example: S001
 *               busId:
 *                 type: string
 *                 example: B001
 *               routeNumber:
 *                 type: string
 *                 example: R001
 *               day:
 *                 type: string
 *                 enum: [sun, mon, tue, wed, thu, fri, sat]
 *                 example: mon
 *               distance:
 *                 type: string
 *                 example: "15 km"
 *     responses:
 *       201:
 *         description: Schedule created successfully
 *         content:
 *           application/json:
 *             example:
 *               message: Schedule created successfully      
 *               newSchedule:
 *                scheduleId: S001
 *                busId: B001
 *                routeNumber: R001
 *                day: mon
 *                distance: 15 km
 *                confirmationStatus: pending   
 *       400:
 *         description: Validation error
 *       404:
 *         description: Bus or route not found
 *       409:
 *         description: Schedule ID already exists
 *       500:
 *         description: Internal server error
 */

//create schedule
router.post('/schedules', (req, res) => {

    // Joi schema for schedule validation
    const scheduleSchema = Joi.object({
        scheduleId: Joi.string().required(),
        busId: Joi.string().required(),
        routeNumber: Joi.string().required(),
        day: Joi.string().valid('sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat').required(),
        distance: Joi.string().required(),

    });

    // Validate request body
    const { error, value } = scheduleSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const { scheduleId, busId, routeNumber, day, distance } = value;

    // 1. Check if scheduleId already exists
    Schedule.findOne({ scheduleId })
        .then(existingSchedule => {
            if (existingSchedule) {
                console.log('Schedule ID already exists');
                return res.status(409).json({ error: 'Schedule ID already exists' });
            }

            // 2. Check if bus exists
            Bus.findOne({ busId })
                .then(existingBus => {
                    if (!existingBus) {
                        console.log('Bus ID not found');
                        return res.status(404).json({ error: 'Bus ID not found' });
                    }

                    // 3. Check if route exists
                    Route.findOne({ routeNumber: routeNumber })
                        .then(existingRoute => {
                            if (!existingRoute) {
                                console.log('Route ID not found');
                                return res.status(404).json({ error: 'Route ID not found' });
                            }

                            // 4. Create new schedule
                            const newSchedule = new Schedule({
                                scheduleId,
                                busId,
                                routeNumber,
                                day,
                                distance,

                            });

                            // Save to DB
                            newSchedule.save()
                                .then(() => {
                                    console.log('Schedule created successfully');
                                    res.status(201).json({ message: 'Schedule created successfully', newSchedule });
                                })
                                .catch(err => {
                                    console.error('Error while saving the schedule:', err);
                                    res.status(500).json({ error: 'Internal server error' });
                                });

                        })
                        .catch(err => {
                            console.error('Error while checking route:', err);
                            res.status(500).json({ error: 'Internal server error' });
                        });
                })
                .catch(err => {
                    console.error('Error while checking bus:', err);
                    res.status(500).json({ error: 'Internal server error' });
                });
        })
        .catch(err => {
            console.error('Error while checking schedule:', err);
            res.status(500).json({ error: 'Internal server error' });
        });

});

/**
 * @swagger
 * /admin/schedules/{scheduleId}:
 *   put:
 *     summary: Update a schedule
 *     description: Updates an existing schedule identified by its scheduleId.
 *     tags: [Admin]
 *     parameters:
 *       - in: path
 *         name: scheduleId
 *         schema:
 *           type: string
 *         required: true
 *         description: The ID of the schedule to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - busId
 *               - routeNumber
 *               - day
 *               - distance
 *             properties:
 *               busId:
 *                 type: string
 *                 example: B001
 *               routeNumber:
 *                 type: string
 *                 example: R001
 *               day:
 *                 type: string
 *                 enum: [sun, mon, tue, wed, thu, fri, sat]
 *                 example: mon
 *               distance:
 *                 type: string
 *                 example: "15 km"
 *     responses:
 *       200:
 *         description: Schedule updated successfully
 *         content:
 *           application/json:
 *             example:
 *               message: Schedule updated successfully
 *       400:
 *         description: Validation error
 *       404:
 *         description: Schedule, bus, or route not found
 *       500:
 *         description: Internal server error
 */

//update schedule by scheduleId
router.put('/schedules/:scheduleId', (req, res) => {
    const scheduleIdParam = req.params.scheduleId;

    // Joi schema for validation
    const scheduleSchema = Joi.object({
        busId: Joi.string().required(),
        routeNumber: Joi.string().required(),
        day: Joi.string().valid('sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat').required(),
        distance: Joi.string().required()

    });

    // Validate request body
    const { error, value } = scheduleSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const { busId, routeNumber, day, distance } = value;

    // Check if schedule exists
    Schedule.findOne({ scheduleId: scheduleIdParam })
        .then(schedule => {
            if (!schedule) {
                console.log('Schedule not found');
                return res.status(404).json({ error: 'Schedule not found' });
            }

            // Check if bus exists
            Bus.findOne({ busId })
                .then(existingBus => {
                    if (!existingBus) {
                        console.log('Bus ID not found');
                        return res.status(404).json({ error: 'Bus ID not found' });
                    }

                    // Check if route exists
                    Route.findOne({ routeNumber })
                        .then(existingRoute => {
                            if (!existingRoute) {
                                console.log('Route number not found');
                                return res.status(404).json({ error: 'Route number not found' });
                            }

                            // Update schedule fields
                            schedule.busId = busId;
                            schedule.routeNumber = routeNumber;
                            schedule.day = day;
                            schedule.distance = distance;


                            // Save updated schedule
                            schedule.save()
                                .then(() => {
                                    console.log('Schedule updated successfully');
                                    res.status(200).json({ message: 'Schedule updated successfully' });
                                })
                                .catch(err => {
                                    console.error('Error while saving the schedule:', err);
                                    res.status(500).json({ error: 'Internal server error' });
                                });
                        })
                        .catch(err => {
                            console.error('Error while checking route:', err);
                            res.status(500).json({ error: 'Internal server error' });
                        });
                })
                .catch(err => {
                    console.error('Error while checking bus:', err);
                    res.status(500).json({ error: 'Internal server error' });
                });
        })
        .catch(err => {
            console.error('Error while checking schedule:', err);
            res.status(500).json({ error: 'Internal server error' });
        });
});

/**
 * @swagger
 * /admin/schedules/{scheduleId}:
 *   delete:
 *     summary: Delete a schedule
 *     description: Deletes a schedule identified by its scheduleId.
 *     tags: [Admin]
 *     parameters:
 *       - in: path
 *         name: scheduleId
 *         schema:
 *           type: string
 *         required: true
 *         description: The ID of the schedule to delete
 *     responses:
 *       200:
 *         description: Schedule deleted successfully
 *         content:
 *           application/json:
 *             example:
 *               message: Schedule deleted
 *       404:
 *         description: Schedule not found
 *         content:
 *           application/json:
 *             example:
 *               error: Schedule not found
 *       500:
 *         description: Internal server error
 */

//delete schedule with scheduleId
router.delete('/schedules/:scheduleId', (req, res) => {
    const scheduleId = req.params.scheduleId;

    Schedule.findOne({ scheduleId: scheduleId })
        .then(schedule => {
            if (!schedule) {
                console.log('Schedule not found');
                return res.status(404).json({ error: 'Schedule not found' });
            }

            schedule.deleteOne()
                .then(() => {
                    console.log('Schedule deleted');
                    res.status(200).json({ message: 'Schedule deleted' });
                })
                .catch(error => {
                    console.error('Error while deleting the Schedule:', error);
                    res.status(500).json({ error: 'Internal server error' });
                });
        })
        .catch(error => {
            console.error('Error while finding the Schedule:', error);
            res.status(500).json({ error: 'Internal server error' });
        });
});


/**
 * @swagger
 * /admin/schedules:
 *   get:
 *     summary: Get schedules with optional filters
 *     description: Retrieve all schedules or filter them by scheduleId, busId, routeNumber, day, distance, or confirmationStatus.
 *     tags: [Admin]
 *     parameters:
 *       - in: query
 *         name: scheduleId
 *         schema:
 *           type: string
 *         description: Filter by schedule ID
 *       - in: query
 *         name: busId
 *         schema:
 *           type: string
 *         description: Filter by bus ID
 *       - in: query
 *         name: routeNumber
 *         schema:
 *           type: string
 *         description: Filter by route number
 *       - in: query
 *         name: day
 *         schema:
 *           type: string
 *           enum: [sun, mon, tue, wed, thu, fri, sat]
 *         description: Filter by day
 *       - in: query
 *         name: distance
 *         schema:
 *           type: string
 *         description: Filter by distance
 *       - in: query
 *         name: confirmationStatus
 *         schema:
 *           type: boolean
 *         description: Filter by confirmation status
 *     responses:
 *       200:
 *         description: List of schedules
 *         content:
 *           application/json:
 *             example:
 *               - scheduleId: S001
 *                 busId: B001
 *                 routeNumber: R001
 *                 day: mon
 *                 distance: "15 km"
 *                 confirmationStatus: true
 *       404:
 *         description: No schedules found
 *         content:
 *           application/json:
 *             example:
 *               error: No schedule found
 *       500:
 *         description: Internal server error
 */

// Get schedules | filter by scheduleId busId, routeNumber, day, distance , confirmationStatus
router.get('/schedules', (req, res) => {
    const { scheduleId, busId, routeNumber, day, distance, confirmationStatus } = req.query;

    let filter = {};

    if (scheduleId) filter.scheduleId = scheduleId;
    if (busId) filter.busId = busId;
    if (routeNumber) filter.routeNumber = routeNumber;
    if (day) filter.day = day;
    if (distance) filter.distance = distance;
    if (confirmationStatus) filter.confirmationStatus = confirmationStatus;

    Schedule.find(filter)
        .then(schedule => {
            if (schedule.length === 0) {
                return res.status(404).json({ error: 'No schedule found' });
            }
            res.status(200).json(schedule);
        })
        .catch(err => {
            console.error('Error fetching schedules:', err);
            res.status(500).json({ error: 'Internal server error' });
        });
});

module.exports = router;