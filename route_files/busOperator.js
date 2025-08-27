const express = require('express')
const router = express.Router()
const mongoose = require('mongoose')
const User = require('../db_schema_models/userModel.js');
const Route = require('../db_schema_models/routeModel.js');
const Bus = require('../db_schema_models/busModel.js');
const Schedule = require('../db_schema_models/scheduleModel.js');

const bcrypt = require('bcrypt');
const Joi = require('joi');

//middleware for checking request object contain a userRole as busOperator
router.use((req, res, next) => {
    if (req.userRole === 'busOperator') {
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
 *   name: Bus Operator
 *   description: Admin APIs to manage users, routes, buses, and schedules
 */




////////////////////////////////bus management////////////////////////////////////////////

/**
 * @swagger
 * /buses:
 *   post:
 *     summary: Create a new bus
 *     description: Creates a new bus and assigns the currently logged-in user as the operator.
 *     tags: [Bus Operator]
 *     security:
 *       - bearerAuth: []  # assuming JWT auth or similar
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - busId
 *               - busNumber
 *               - routeId
 *             properties:
 *               busId:
 *                 type: string
 *                 example: B001
 *               busNumber:
 *                 type: string
 *                 example: AB-1234
 *               routeId:
 *                 type: string
 *                 example: R001
 *     responses:
 *       201:
 *         description: Bus created successfully
 *         content:
 *           application/json:
 *             example:
 *               message: Bus created successfully
 *               bus:
 *                 busId: B001
 *                 busNumber: AB-1234
 *                 operatorUsername: mpabasara11
 *                 routeId: R001
 *       404:
 *         description: Route ID not found
 *         content:
 *           application/json:
 *             example:
 *               error: Route ID not found
 *       409:
 *         description: Bus ID or bus number already exists
 *         content:
 *           application/json:
 *             example:
 *               error: Bus ID already exists
 *       500:
 *         description: Internal server error
 */

// create bus
router.post('/buses', (req, res) => {

    const loggedInUsername = req.userName

    // Joi schema for bus validation
    const busSchema = Joi.object({
        busId: Joi.string().required(),
        busNumber: Joi.string().required(),
        routeId: Joi.string().required(),

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
                                operatorUsername: loggedInUsername, // assign current logged-in user
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


/**
 * @swagger
 * /buses/{busId}/workflowStatus:
 *   patch:
 *     summary: Set a bus workflowStatus to inactive
 *     description: Updates the workflowStatus of a bus to inactive. Only the bus operator can perform this action. Pending buses cannot be updated.
 *     tags: [Bus Operator]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: busId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the bus to update
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
 *                 enum: [inactive]
 *                 example: inactive
 *     responses:
 *       200:
 *         description: Workflow status updated successfully
 *         content:
 *           application/json:
 *             example:
 *               message: Workflow status updated successfully
 *               bus:
 *                 busId: B001
 *                 busNumber: AB-1234
 *                 operatorUsername: mpabasara11
 *                 routeId: R001
 *                 workflowStatus: inactive
 *       400:
 *         description: Invalid request body
 *         content:
 *           application/json:
 *             example:
 *               error: "Invalid workflowStatus value"
 *       403:
 *         description: Not authorized to update this bus
 *         content:
 *           application/json:
 *             example:
 *               error: "Not authorized to update this bus"
 *       404:
 *         description: Bus not found
 *         content:
 *           application/json:
 *             example:
 *               error: "Bus not found"
 *       500:
 *         description: Internal server error
 */

// Update only workflowStatus of a bus by busId (inactive the bus)
router.patch('/buses/:busId/workflowStatus', (req, res) => {
    const busIdParam = req.params.busId;
    const loggedInUsername = req.userName;

    // Joi schema for validation 
    const busSchema = Joi.object({
        workflowStatus: Joi.string().valid('inactive').required()
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

            // Check if bus belongs to the logged-in operator
            if (bus.operatorUsername !== loggedInUsername) {
                console.log('Not authorized to update this bus');
                return res.status(403).json({ error: 'Not authorized to update this bus' });
            }

            if (bus.workflowStatus == "pending") {
                console.log('Not authorized to update pending buses');
                return res.status(403).json({ error: 'Not authorized to update pending buses' });
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

/**
 * @swagger
 * /buses/{busId}/location:
 *   patch:
 *     summary: Update bus location
 *     description: Updates the latitude and longitude of a bus. Only the bus operator can update the location. The locationLastUpdate timestamp is automatically set to the current time.
 *     tags: [Bus Operator]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: busId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the bus to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - latitude
 *               - longitude
 *             properties:
 *               latitude:
 *                 type: number
 *                 minimum: -90
 *                 maximum: 90
 *                 example: 6.9271
 *               longitude:
 *                 type: number
 *                 minimum: -180
 *                 maximum: 180
 *                 example: 79.8612
 *     responses:
 *       200:
 *         description: Bus location updated successfully
 *         content:
 *           application/json:
 *             example:
 *               message: Bus location updated successfully
 *               bus:
 *                 busId: B001
 *                 busNumber: AB-1234
 *                 operatorUsername: mpabasara11
 *                 routeId: R001
 *                 latitude: 6.9271
 *                 longitude: 79.8612
 *                 locationLastUpdate: "2025-08-28T06:15:30.000Z"
 *       400:
 *         description: Invalid request body
 *         content:
 *           application/json:
 *             example:
 *               error: "Latitude or longitude is missing or invalid"
 *       403:
 *         description: Not authorized to update this bus
 *         content:
 *           application/json:
 *             example:
 *               error: "Not authorized to update this bus"
 *       404:
 *         description: Bus not found
 *         content:
 *           application/json:
 *             example:
 *               error: "Bus not found"
 *       500:
 *         description: Internal server error
 */

//update bus location by busId
router.patch('/buses/:busId/location', (req, res) => {
    const busIdParam = req.params.busId;
    const loggedInUsername = req.userName;


    // Joi schema for validation 
    const busSchema = Joi.object({

        latitude: Joi.number().min(-90).max(90).required(),
        longitude: Joi.number().min(-180).max(180).required()

    });

    // Validate request body
    const { error, value } = busSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const { latitude, longitude } = value;

    // Check if bus exists
    Bus.findOne({ busId: busIdParam })
        .then(bus => {
            if (!bus) {
                console.log('Bus not found');
                return res.status(404).json({ error: 'Bus not found' });
            }

            // Check if bus belongs to the logged-in operator
            if (bus.operatorUsername !== loggedInUsername) {
                console.log('Not authorized to update this bus');
                return res.status(403).json({ error: 'Not authorized to update this bus' });
            }

            // Update long and lat manually then time automaticaly
            bus.latitude = latitude;
            bus.longitude = longitude;
            bus.locationLastUpdate = Date.now();

            // Save updated bus
            bus.save()
                .then(() => {
                    console.log('Bus location updated successfully');
                    res.status(200).json({ message: 'Bus location updated successfully', bus });
                })
                .catch(err => {
                    console.error('Error while saving the location:', err);
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
 * /buses/{busId}:
 *   delete:
 *     summary: Delete a bus
 *     description: Deletes a bus and all its associated schedules. Only the operator who owns the bus can delete it.
 *     tags: [Bus Operator]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: busId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the bus to delete
 *     responses:
 *       200:
 *         description: Bus and associated schedules deleted successfully
 *         content:
 *           application/json:
 *             example:
 *               message: "Bus and associated schedules deleted successfully"
 *       403:
 *         description: Not authorized to delete this bus
 *         content:
 *           application/json:
 *             example:
 *               error: "Not authorized to delete this bus"
 *       404:
 *         description: Bus not found
 *         content:
 *           application/json:
 *             example:
 *               error: "Bus not found"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             example:
 *               error: "Internal server error"
 */

//delete bus with busId //only owned busses can be deleted
router.delete('/buses/:busId', (req, res) => {
    const busId = req.params.busId;
    const loggedInUsername = req.userName;

    Bus.findOne({ busId: busId })
        .then(bus => {
            if (!bus) {
                console.log('Bus not found');
                return res.status(404).json({ error: 'Bus not found' });
            }

            // Check if bus belongs to the logged-in operator
            if (bus.operatorUsername !== loggedInUsername) {
                console.log('Not authorized to delete this bus');
                return res.status(403).json({ error: 'Not authorized to delete this bus' });
            }

            bus.deleteOne()
                .then(() => {
                    console.log('Bus deleted successfully');
                    // res.status(200).json({ message: 'Bus deleted successfully' });

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
 * /buses:
 *   get:
 *     summary: Get operator-owned buses
 *     description: Retrieve all buses owned by the logged-in operator. Supports filtering by busId, busNumber, routeId, and workflowStatus.
 *     tags: [Bus Operator]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: busId
 *         schema:
 *           type: string
 *         description: Filter by bus ID
 *       - in: query
 *         name: busNumber
 *         schema:
 *           type: string
 *         description: Filter by bus number
 *       - in: query
 *         name: routeId
 *         schema:
 *           type: string
 *         description: Filter by route ID
 *       - in: query
 *         name: workflowStatus
 *         schema:
 *           type: string
 *           enum: [pending, active, inactive]
 *         description: Filter by workflow status
 *     responses:
 *       200:
 *         description: List of buses owned by the operator
 *         content:
 *           application/json:
 *             example:
 *               - busId: "BUS001"
 *                 busNumber: "ABC-123"
 *                 operatorUsername: "operator1"
 *                 routeId: "R001"
 *                 workflowStatus: "active"
 *       404:
 *         description: No buses found for the operator
 *         content:
 *           application/json:
 *             example:
 *               error: "No buses found"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             example:
 *               error: "Internal server error"
 */

// Get buses | filter by busId busNumber, routeId, workflowStatus
router.get('/buses', (req, res) => {
    const { busId, busNumber, routeId, workflowStatus } = req.query;
    const loggedInUsername = req.userName;

    let filter = { operatorUsername: loggedInUsername }; // Force operator to see only their buses

    if (busId) filter.busId = busId;
    if (busNumber) filter.busNumber = busNumber;
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


//////////////////////////////route management///////////////////////////////////////////
/**
 * @swagger
 * /routes:
 *   get:
 *     summary: Get bus routes
 *     description: Retrieve all bus routes with optional filters.
 *     tags: [Bus Operator]
 *     parameters:
 *       - in: query
 *         name: routeNumber
 *         schema:
 *           type: string
 *         description: Filter by route number
 *       - in: query
 *         name: routeName
 *         schema:
 *           type: string
 *         description: Filter by route name
 *       - in: query
 *         name: startLocation
 *         schema:
 *           type: string
 *         description: Filter by start location
 *       - in: query
 *         name: endLocation
 *         schema:
 *           type: string
 *         description: Filter by end location
 *       - in: query
 *         name: status
 *         schema:
 *           type: boolean
 *         description: Filter by route status (true for active, false for inactive)
 *     responses:
 *       200:
 *         description: List of routes matching the filters
 *         content:
 *           application/json:
 *             example:
 *               - routeNumber: "R001"
 *                 routeName: "Main Street Express"
 *                 startLocation: "City Center"
 *                 endLocation: "Airport"
 *                 distance: 15
 *                 status: true
 *       404:
 *         description: No routes found
 *         content:
 *           application/json:
 *             example:
 *               error: "No routes found"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             example:
 *               error: "Internal server error"
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



//////////////////////////////schedule management///////////////////////////////////////////

/**
 * @swagger
 * /schedules/{scheduleId}/confirmationStatus:
 *   patch:
 *     summary: Update the confirmation status of a schedule
 *     description: Accept or reject a schedule when it is pending. Once accepted or rejected, it cannot be updated.
 *     tags: [Bus Operator]
 *     parameters:
 *       - in: path
 *         name: scheduleId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the schedule to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               confirmationStatus:
 *                 type: string
 *                 enum: [accepted, rejected]
 *             required:
 *               - confirmationStatus
 *           example:
 *             confirmationStatus: "accepted"
 *     responses:
 *       200:
 *         description: Confirmation status updated successfully
 *         content:
 *           application/json:
 *             example:
 *               message: "schedule confirmationStatus updated successfully"
 *               schedule:
 *                 scheduleId: "S123"
 *                 busId: "B123"
 *                 routeNumber: "R001"
 *                 day: "mon"
 *                 distance: "15km"
 *                 confirmationStatus: "accepted"
 *       400:
 *         description: Invalid request body
 *         content:
 *           application/json:
 *             example:
 *               error: "confirmationStatus must be one of [accepted, rejected]"
 *       403:
 *         description: Not authorized to update the schedule
 *         content:
 *           application/json:
 *             example:
 *               error: "Not authorized to update already accepted schedules"
 *       404:
 *         description: Schedule not found
 *         content:
 *           application/json:
 *             example:
 *               error: "Schedule not found"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             example:
 *               error: "Internal server error"
 */

//update schedule confirmationStatus by scheduleId   //accept or reject when it is pending
router.patch('/schedules/:scheduleId/confirmationStatus', (req, res) => {
    const scheduleId = req.params.scheduleId;

    // Joi schema for validation (only status now)
    const scheduleSchema = Joi.object({
        confirmationStatus: Joi.string().valid('accepted', 'rejected').required()
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

            if (schedule.confirmationStatus == "accepted") {
                console.log('Not authorized to update already accepted schedules');
                return res.status(403).json({ error: 'Not authorized to update already accepted schedules' });
            }
            if (schedule.confirmationStatus == "rejected") {
                console.log('Not authorized to update already rejected schedules');
                return res.status(403).json({ error: 'Not authorized to update already rejected schedules' });
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


/**
 * @swagger
 * /schedules:
 *   get:
 *     summary: Retrieve schedules with optional filters
 *     description: Get a list of schedules filtered by scheduleId, busId, routeNumber, day, distance, or confirmationStatus.
 *     tags: [Bus Operator]
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
 *         description: Filter by day of the week
 *       - in: query
 *         name: distance
 *         schema:
 *           type: string
 *         description: Filter by distance
 *       - in: query
 *         name: confirmationStatus
 *         schema:
 *           type: string
 *           enum: [pending, accepted, rejected]
 *         description: Filter by schedule confirmation status
 *     responses:
 *       200:
 *         description: List of schedules found
 *         content:
 *           application/json:
 *             example:
 *               - scheduleId: "S123"
 *                 busId: "B123"
 *                 routeNumber: "R001"
 *                 day: "mon"
 *                 distance: "15km"
 *                 confirmationStatus: "pending"
 *       404:
 *         description: No schedules found
 *         content:
 *           application/json:
 *             example:
 *               error: "No schedule found"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             example:
 *               error: "Internal server error"
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

