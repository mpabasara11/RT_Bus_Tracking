const express = require('express')
const router = express.Router()
const mongoose = require('mongoose')
const User = require('../db_schema_models/userModel.js');
const Route = require('../db_schema_models/routeModel.js');
const Bus = require('../db_schema_models/busModel.js');
const Schedule = require('../db_schema_models/scheduleModel.js');


const bcrypt = require('bcrypt');
const Joi = require('joi');


//middleware for checking request object contain a userRole as admin
router.use((req,res,next) => {
    if(req.userRole === 'admin')
    {
        next();
    }
    else
    {
        res.status(403).json({error:'Forbidden'});
        
    }
}
)





////////////////////////////////User Management //////////////////////////////////////


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
                    res.status(201).json({ message: 'User created' });
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
                $or: [ { email }, { nic }],
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
                    res.status(200).json({ message: 'User status updated successfully', user });
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

 
 //get users | filter by userName userRole firstName lastName nic status 
 router.get('/users',(req,res)=>{

    const {  userName , userRole , firstName , lastName , nic , status } = req.query; // read query parameters

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
         console.error('Error while getting all users:',error);
         res.status(500).json({error:'Internal server error'});
     });
 })
 


////////////////////////////////Route Management //////////////////////////////////////


//create bus route
router.post('/routes', (req, res) => {

    // Joi schema for route validation
    const routeSchema = Joi.object({
        routeNumber: Joi.string().required(),
        routeName: Joi.string().required(),
        startLocation: Joi.string().required(),
        endLocation: Joi.string().required(),
        distance: Joi.number().positive().required(),
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
                    res.status(201).json({ message: 'Route created' });
                })
                .catch(error => {
                    console.error('Error while saving the route:', error);
                    res.status(500).json({ error: 'Internal server error' });
                });
        });
});

 //update bus route details by routeNumber
 router.put('/routes/:routeNumber', (req, res) => {
     const routeNumber = req.params.routeNumber;
 
     // Joi schema for route update
     const routeSchema = Joi.object({
         routeName: Joi.string().required(),
         startLocation: Joi.string().required(),
         endLocation: Joi.string().required(),
         distance: Joi.number().positive().required(),
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
                    res.status(200).json({ message: 'Route status updated successfully', route });
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


 //get bus routes | filter by routeName routeNumber startLocation endLocation status
 router.get('/routes', (req, res) => {
    const { routeNumber, routeName , startLocation , endLocation , status } = req.query; // read query parameters

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

// create bus
router.post('/buses', (req, res) => {

    // Joi schema for bus validation
    const busSchema = Joi.object({
        busId: Joi.string().required(),       
        busNumber: Joi.string().required(),
        operatorUsername: Joi.string().required(),
        routeId: Joi.string().required(),
        workflowStatus: Joi.string().valid('pending', 'active' , 'inactive').required()
      
    });

    // Validate request body
    const { error, value } = busSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const { busId, busNumber, operatorUsername, routeId, workflowStatus  } = value;

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
            Route.findOne({routeNumber:routeId})
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
                                            res.status(201).json({ message: 'Bus created successfully', bus: newBus });
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


//update bus by busId
router.put('/buses/:busId', (req, res) => {
    const busIdParam = req.params.busId;

    // Joi schema for validation
    const busSchema = Joi.object({
        busNumber: Joi.string().required(),
        operatorUsername: Joi.string().required(),
        routeId: Joi.string().required(),
        workflowStatus: Joi.string().valid('pending', 'active' , 'inactive').required()
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
                                            res.status(200).json({ message: 'Bus updated successfully', bus });
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
                    res.status(200).json({ message: 'Workflow status updated successfully', bus });
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
                    res.status(200).json({ message: 'Bus deleted' });
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

// Get buses | filter by busId busNumber, operatorUsername, routeId, workflowStatus
router.get('/buses', (req, res) => {
    const {busId , busNumber, operatorUsername, routeId, workflowStatus } = req.query;

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

//create schedule
router.post('/schedules', (req, res) => {

    // Joi schema for schedule validation
    const scheduleSchema = Joi.object({
        scheduleId: Joi.string().required(),
        busId: Joi.string().required(),
        routeNumber: Joi.string().required(),
        day: Joi.string().valid('sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat').required(),
        distance: Joi.string().required(),
        confirmationStatus: Joi.string().valid('pending', 'accepted', 'rejected').required()
    });

    // Validate request body
    const { error, value } = scheduleSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const { scheduleId, busId, routeNumber, day, distance, confirmationStatus } = value;

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
                                confirmationStatus
                            });

                            // Save to DB
                            newSchedule.save()
                                .then(() => {
                                    console.log('Schedule created successfully');
                                    res.status(201).json({ message: 'Schedule created successfully', schedule: newSchedule });
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
                                    res.status(200).json({ message: 'Schedule updated successfully', schedule });
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

//update schedule confirmationStatus by scheduleId                   ///not needed for admin
router.patch('/schedules/:scheduleId/confirmationStatus', (req, res) => {
    const scheduleId = req.params.scheduleId;

    // Joi schema for validation (only status now)
    const scheduleSchema = Joi.object({
        confirmationStatus: Joi.string().valid('pending', 'accepted', 'rejected').required()
    });

    // Validate request body
    const { error, value } = scheduleSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const { confirmationStatus } = value;

    // Check if schedule exists
    Schedule.findOne({ scheduleId })
        .then(schedule => {
            if (!schedule) {
                console.log('Schedule not found');
                return res.status(404).json({ error: 'Schedule not found' });
            }

            // Update only confirmationStatus
            schedule.confirmationStatus = confirmationStatus;

            // Save updated schedule
            schedule.save()
                .then(() => {
                    console.log('schedule confirmationStatus updated successfully');
                    res.status(200).json({ message: 'schedule confirmationStatus updated successfully', schedule });
                })
                .catch(err => {
                    console.error('Error while updating the schedule confirmationStatus:', err);
                    res.status(500).json({ error: 'Internal server error' });
                });
        })
        .catch(err => {
            console.error('Error while checking schedule:', err);
            res.status(500).json({ error: 'Internal server error' });
        });
});


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


// Get schedules | filter by scheduleId busId, routeNumber, day, distance , confirmationStatus
router.get('/schedules', (req, res) => {
    const {scheduleId , busId, routeNumber, day, distance , confirmationStatus } = req.query;

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