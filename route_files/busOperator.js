const express = require('express')
const router = express.Router()
const mongoose = require('mongoose')
const User = require('../db_schema_models/userModel.js');
const Route = require('../db_schema_models/routeModel.js');
const Bus = require('../db_schema_models/busModel.js');

const bcrypt = require('bcrypt');
const Joi = require('joi');

//middleware for checking request object contain a userRole as busOperator
router.use((req,res,next) => {
    if(req.userRole === 'busOperator')
    {
        next();
    }
    else
    {
        res.status(403).json({error:'Forbidden'});
        
    }
}
)


////////////////////////////////bus management////////////////////////////////////////////

// create bus
router.post('/buses', (req, res) => {

    // Joi schema for bus validation
    const busSchema = Joi.object({
        busId: Joi.string().required(),
        busNumber: Joi.string().required(),
        routeId: Joi.string().required(),
      //  workflowStatus: Joi.string().valid('pending', 'active', 'inactive').default('pending')
    });

    // Validate request body
    const { error, value } = busSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const { busId, busNumber, routeId } = value;

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

                    // Check if busNumber already exists
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
                                operatorUsername: req.userName, // assign current logged-in user
                                routeId
                                
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
router.patch('/buses/:busId', (req, res) => {
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

 


