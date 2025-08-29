const express = require('express')
const router = express.Router()
const mongoose = require('mongoose')
const User = require('../db_schema_models/userModel.js');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const jwtSecret = "secret"
const Joi = require('joi');


/**
 * @swagger
 * tags:
 *   name: Authentication
 *   description: Commuter APIs to view routes, buses, and schedules
 */

/**
 * @swagger
 * /auth/signin:
 *   post:
 *     summary: Sign in a user
 *     description: Authenticate user by username and password. Returns JWT in cookie if successful.
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userName
 *               - password
 *             properties:
 *               userName:
 *                 type: string
 *                 example: mpabasara11
 *               password:
 *                 type: string
 *                 example: zzzzzz
 *     responses:
 *       200:
 *         description: Successful sign-in
 *         content:
 *           application/json:
 *             example:
 *               message: User signed in
 *       400:
 *         description: Validation error
 *       401:
 *         description: Incorrect password
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */


//sign in
router.post('/signin', (req, res) => {
    // Joi schema for sign-in
    const signInSchema = Joi.object({
        userName: Joi.string().required(),
        password: Joi.string().required()
    });

    // Validate request body
    const { error, value } = signInSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const { userName, password } = value;

    // Check if username exists
    User.findOne({ userName })
        .then(user => {
            if (!user) {
                console.log('User not found');
                return res.status(404).json({ error: 'User not found' });
            }

            // Compare the password
            bcrypt.compare(password, user.passwordHashCode, function (err, result) {
                if (result) {
                    console.log('User signed in');

                    // Generate a token
                    const token = jwt.sign({
                        userName: user.userName,
                        userRole: user.userRole,
                        firstName: user.firstName,
                        lastName: user.lastName,
                        email: user.email,
                        nic: user.nic
                    }, jwtSecret, { expiresIn: '1h' });

                    res.cookie('state_token', token, {
                        httpOnly: true,
                        secure: process.env.NODE_ENV === 'production',
                        maxAge: 3600000
                    });

                    res.status(200).json({ message: 'User signed in' });
                } else {
                    console.log('Incorrect password');
                    res.status(401).json({ error: 'Incorrect password' });
                }
            });
        });
});



/**
 * @swagger
 * /auth/signout:
 *   post:
 *     summary: Sign out a user
 *     description: Clears the JWT cookie and logs the user out.
 *     tags: [Authentication]
 *     responses:
 *       200:
 *         description: Successful sign-out
 *         content:
 *           application/json:
 *             example:
 *               message: User signed out
 *       500:
 *         description: Internal server error
 */


//sign out
router.post('/signout', (req, res) => {
    try {
        res.clearCookie('state_token', { httpOnly: true, secure: process.env.NODE_ENV === 'production' });
        res.status(200).json({ message: 'User signed out' });
    } catch (err) {
        res.status(500).json({ message: 'An error occurred while signing out' });
    }
})


/**
 * @swagger
 * /auth/password_reset:
 *   post:
 *     summary: Reset user password
 *     description: Allows a user to reset their password by providing the previous password and a new password.
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userName
 *               - previousPassword
 *               - password
 *             properties:
 *               userName:
 *                 type: string
 *                 example: mpabasara11
 *               previousPassword:
 *                 type: string
 *                 example: zzzzzz
 *               password:
 *                 type: string
 *                 example: aaaaaa
 *     responses:
 *       200:
 *         description: Password updated successfully
 *         content:
 *           application/json:
 *             example:
 *               message: Password updated
 *       401:
 *         description: Incorrect previous password
 *         content:
 *           application/json:
 *             example:
 *               error: Incorrect previous password
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



//password reset
router.post('/password_reset', (req, res) => {
    const userName = req.body.userName
    const previousPassword = req.body.previousPassword
    const password = req.body.password

    //check if username exists
    User.findOne({ userName: userName })
        .then(user => {
            if (user) {
                //validate the previous password with password on database
                bcrypt.compare(previousPassword, user.passwordHashCode, function (err, result) {
                    if (result) {
                        //if password is same as the previous password then proceed to reset the password
                        const saltRounds = 10;
                        const passwordHashCode = bcrypt.hashSync(password, saltRounds);
                        user.passwordHashCode = passwordHashCode;
                        user.save()
                            .then(() => {
                                console.log('Password updated');
                                res.status(200).json({ message: 'Password updated' });
                            })
                            .catch(error => {
                                console.error('Error while updating the password:', error);
                                res.status(500).json({ error: 'Internal server error' });
                            });

                    } else {
                        console.log('Incorrect previous password');
                        res.status(401).json({ error: 'Incorrect previous password' });
                    }


                }
                )

            }
            else {
                console.log('User not found');
                res.status(404).json({ error: 'User not found' });
            }
        })
})



module.exports = router;