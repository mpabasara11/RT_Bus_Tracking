const express = require('express')
const router = express.Router()
const mongoose = require('mongoose')
const User = require('../db_schema_models/userModel.js');
const Route = require('../db_schema_models/routeModel.js');
const Bus = require('../db_schema_models/busModel.js');
const Schedule = require('../db_schema_models/scheduleModel.js');

const bcrypt = require('bcrypt');
const Joi = require('joi');

////////////////////////route management/////////////////////////////////////


/**
 * @swagger
 * tags:
 *   name: Commuter
 *   description: Commuter APIs to view routes, buses, and schedules
 */

/**
 * @swagger
 * /commuter/routes:
 *   get:
 *     summary: View routes
 *     description: Fetch bus routes with optional filters by routeNumber, routeName, startLocation, endLocation.
 *     tags: [Commuter]
 *     parameters:
 *       - in: query
 *         name: routeNumber
 *         schema:
 *           type: string
 *           example: r001
 *         description: Filter by route number
 *       - in: query
 *         name: routeName
 *         schema:
 *           type: string
 *           example: rn01
 *         description: Filter by route name
 *       - in: query
 *         name: startLocation
 *         schema:
 *           type: string
 *           example: colombo
 *         description: Filter by start location
 *       - in: query
 *         name: endLocation
 *         schema:
 *           type: string
 *           example: gampaha
 *         description: Filter by end location
 *     responses:
 *       200:
 *         description: List of matching routes
 *         content:
 *           application/json:
 *             example:
 *               - routeNumber: r001
 *                 routeName: rn1
 *                 startLocation: colombo
 *                 endLocation: gampaha
 *       404:
 *         description: No routes found
 *       500:
 *         description: Internal server error
 */

//get bus routes | filter by routeName routeNumber startLocation endLocation 
router.get('/routes', (req, res) => {
    const { routeNumber, routeName, startLocation, endLocation, status } = req.query; // read query parameters

    let filter = { status: true };

    if (routeNumber) filter.routeNumber = routeNumber; //use 'routeNumber' inside filter
    if (routeName) filter.routeName = routeName;       //use 'routeName' inside filter
    if (startLocation) filter.startLocation = startLocation;       //use 'startLocation' inside filter
    if (endLocation) filter.endLocation = endLocation;       //use 'endLocation' inside filter
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



//////////////////////////bus management////////////////////////////

/**
 * @swagger
 * /commuter/buses:
 *   get:
 *     summary: View buses
 *     description: Fetch active buses with optional filters by busId, busNumber, operatorUsername, routeId.
 *     tags: [Commuter]
 *     parameters:
 *       - in: query
 *         name: busId
 *         schema:
 *           type: string
 *           example: bs1
 *       - in: query
 *         name: busNumber
 *         schema:
 *           type: string
 *           example: ab1212
 *       - in: query
 *         name: operatorUsername
 *         schema:
 *           type: string
 *           example: mpabasara12
 *       - in: query
 *         name: routeId
 *         schema:
 *           type: string
 *           example: r001
 *     responses:
 *       200:
 *         description: List of matching buses
 *         content:
 *           application/json:
 *             example:
 *               - busId: bs1
 *                 busNumber: ab1212
 *                 operatorUsername: mpabasara12
 *                 routeId: r001
 *       404:
 *         description: No buses found
 *       500:
 *         description: Internal server error
 */

// Get buses | filter by busId busNumber, operatorUsername, routeId
router.get('/buses', (req, res) => {
    const { busId, busNumber, operatorUsername, routeId, workflowStatus } = req.query;

    let filter = { workflowStatus: "active" };

    if (busId) filter.busId = busId;
    if (busNumber) filter.busNumber = busNumber;
    if (operatorUsername) filter.operatorUsername = operatorUsername;
    if (routeId) filter.routeId = routeId;


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


////////////////////////////////schedule management/////////////////////////

/**
 * @swagger
 * /commuter/schedules:
 *   get:
 *     summary: View schedules
 *     description: Fetch accepted schedules with optional filters by scheduleId, busId, routeNumber, day, distance.
 *     tags: [Commuter]
 *     parameters:
 *       - in: query
 *         name: scheduleId
 *         schema:
 *           type: string
 *           example: s001
 *       - in: query
 *         name: busId
 *         schema:
 *           type: string
 *           example: bs1
 *       - in: query
 *         name: routeNumber
 *         schema:
 *           type: string
 *           example: r001
 *       - in: query
 *         name: day
 *         schema:
 *           type: string
 *           example: tue
 *       - in: query
 *         name: distance
 *         schema:
 *           type: string
 *           example: 10km
 *     responses:
 *       200:
 *         description: List of matching schedules
 *         content:
 *           application/json:
 *             example:
 *               - scheduleId: s001
 *                 busId: aaa
 *                 routeNumber: r001
 *                 day: tue
 *                 distance: 10km
 *       404:
 *         description: No schedules found
 *       500:
 *         description: Internal server error
 */

// Get schedules | filter by scheduleId busId, routeNumber, day, distance , confirmationStatus
router.get('/schedules', (req, res) => {
    const { scheduleId, busId, routeNumber, day, distance } = req.query;

    let filter = { confirmationStatus: "accepted" };

    if (scheduleId) filter.scheduleId = scheduleId;
    if (busId) filter.busId = busId;
    if (routeNumber) filter.routeNumber = routeNumber;
    if (day) filter.day = day;
    if (distance) filter.distance = distance;


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