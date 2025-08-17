const express = require('express')
const router = express.Router()
const mongoose = require('mongoose')
const User = require('../db_schema_models/userModel.js');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const jwtSecret = "secret"



router.post('/signin',(req,res)=>
    {
        const userName = req.body.userName
        const password = req.body.password


        //check if username exists
        User.findOne({userName:userName})
        .then(user => {
            if(user)
            {
                //compare the password
                bcrypt.compare(password, user.passwordHashCode, function(err, result) {
                    if(result)
                    {
                        console.log('User signed in');
                       // res.status(200).json({message:'User signed in'});

                          //generate a token
                            const token = jwt.sign({
                                userName    : user.userName,
                                userRole    : user.userRole,
                                firstName   : user.firstName,
                                lastName    : user.lastName,
                                email       : user.email,
                                nic         : user.nic
                            },jwtSecret,{expiresIn:'1h'});

                            res.cookie('state_token',token,
                                {
                                    httpOnly: true,       // Prevent JavaScript access to the cookie
                                    secure: process.env.NODE_ENV === 'production', // Only send over HTTPS in production
                                    maxAge: 3600000,      // Optional: Set expiration time (in ms)
                                });
                            res.status(200).json({message:'User signed in'});
                    }
                    else
                    {
                        console.log('Incorrect password');
                        res.status(401).json({error:'Incorrect password'});
                    }
                });
            }
            else
            {
                console.log('User not found');
                res.status(404).json({error:'User not found'});
            }
        })
    })


router.post('/signout',(req,res)=>
    {
        try{
        res.clearCookie('state_token',{httpOnly: true,secure: process.env.NODE_ENV === 'production'});
        res.status(200).json({ message: 'User signed out' });
    } catch (err) {
        res.status(500).json({ message: 'An error occurred while signing out' });
    }
    })



router.post('/password_reset',(req,res)=>
    {
        const userName = req.body.userName
        const previousPassword = req.body.previousPassword
        const password = req.body.password

        //check if username exists
        User.findOne({userName:userName})
        .then(user => 
            {
                if(user)
                {
                    //validate the previous password with password on database
                    bcrypt.compare(previousPassword, user.passwordHashCode, function(err, result) {
                        if(result)
                        {
                            //if password is same as the previous password then proceed to reset the password
                            const saltRounds = 10;
                            const passwordHashCode = bcrypt.hashSync(password, saltRounds);
                            user.passwordHashCode = passwordHashCode;
                            user.save()
                            .then(() => {
                                console.log('Password updated');
                                res.status(200).json({message:'Password updated'});
                            })
                            .catch(error => {
                                console.error('Error while updating the password:',error);
                                res.status(500).json({error:'Internal server error'});
                            });

                        }else
                        {
                            console.log('Incorrect previous password');
                            res.status(401).json({error:'Incorrect previous password'});
                        }


                        }
                        )
               
                }
                else
                {
                    console.log('User not found');
                    res.status(404).json({error:'User not found'});
                }
            })
    })



module.exports = router;