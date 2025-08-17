const express = require('express')
const router = express.Router()
const mongoose = require('mongoose')
const User = require('../db_schema_models/userModel.js');
const Route = require('../db_schema_models/routeModel.js');
const bcrypt = require('bcrypt');


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


//create a new user
router.post('/users', (req, res) => {
   
        
    const userName = req.body.userName
    const password = req.body.password
    const userRole = req.body.userRole
    const firstName = req.body.firstName
    const lastName = req.body.lastName
    const email = req.body.email
    const nic = req.body.nic
    
 
 //hash the password
 const saltRounds = 10;
 const passwordHashCode = bcrypt.hashSync(password, saltRounds);
 
 //check if username already exists
 User.findOne({userName:userName})
 .then(user => {
     if(user)
     {
         console.log('User already exists');
         res.status(409).json({error:'User already exists'});
     }
     else
     {
    
         //check user role is valid.user roles are admin,bus operator
         if(userRole === 'admin' || userRole === 'busOperator' )
             {
 
                 const newUser = new User({
                     userName:userName,
                     passwordHashCode:passwordHashCode,
                     userRole:userRole,
                     firstName:firstName,
                     lastName:lastName,
                     email:email,
                     nic:nic
                 });
 
                 newUser.save()
                 .then(() => {
                     console.log('User created');
                     res.status(201).json({message:'User created'});
                 })
                 .catch(error => {
                     console.error('Error while saving the user:',error);
                     res.status(500).json({error:'Internal server error'});
                 });
 
 
 
             }
             else
             {
 
                 console.log('Invalid user role');
                 res.status(400).json({error:'Invalid user role'});
             }
 
     }
 })
 })
 
 
 //update user details
 router.put('/users/:userName', (req, res) => {
 
     const userName = req.params.userName
     const password = req.body.password
     const userRole = req.body.userRole
     const firstName = req.body.firstName
     const lastName = req.body.lastName
     const email = req.body.email
     const nic = req.body.nic
 
 //hash the password
 const saltRounds = 10;
 const passwordHashCode = bcrypt.hashSync(password, saltRounds);
 
 //check if username already exists
 User.findOne({userName:userName})
 .then(user => {
     if(user)
     {
       ///
 
       //check user role is valid.user roles are admin,manager,employee
       if(userRole === 'admin' || userRole === 'busOperator' )
         {
             user.passwordHashCode = passwordHashCode;
             user.userRole = userRole;
             user.firstName = firstName;
             user.lastName = lastName;
             user.email = email;
             user.nic = nic;
     
             user.save()
             .then(() => {
                 console.log('User updated');
                 res.status(200).json({message:'User updated'});
             })
             .catch(error => {
                 console.error('Error while updating the user:',error);
                 res.status(500).json({error:'Internal server error'});
             });
         }
         else
         {
             console.log('Invalid user role');
             res.status(400).json({error:'Invalid user role'});
         }
 
 
 
       
 
     }
     else
     {
         console.log('User not found');
         res.status(404).json({error:'User not found'});
     }
 })
 
 })
 
 
 //delete user
 router.delete('/users/:userName',(req,res)=>{
 
     const userName = req.params.userName
 
     User.findOne({userName:userName})
     .then(user => {
         if(user)
         {
             user.deleteOne()
             .then(() => {
                 console.log('User deleted');
                 res.status(200).json({message:'User deleted'});
             })
             .catch(error => {
                 console.error('Error while deleting the user:',error);
                 res.status(500).json({error:'Internal server error'});
             })
         }
         else
         {
             console.log('User not found')
             res.status(404).json({error:'User not found'});
         }
     })
 })
 
 
 //get all users
 router.get('/users',(req,res)=>{
 
     User.find()
     .then(users => {
         console.log('Users found');
         res.status(200).json(users);
     })
     .catch(error => {
         console.error('Error while getting all users:',error);
         res.status(500).json({error:'Internal server error'});
     });
 })
 
 
 
 //get user by username
 router.get('/users/:userName',(req,res)=>
     {
         const userName = req.params.userName
 
         User.findOne({userName:userName})
         .then(user => {
             if(user)
             {
                 console.log('User found');
                 res.status(200).json(user);
             }
             else
             {
                 console.log('User not found');
                 res.status(404).json({error:'User not found'});
             }
         })
     })


//create bus route
router.post('/routes', (req, res) => {
   
        
    const routeNumber = req.body.routeNumber
    const routeName = req.body.routeName
    const startLocation = req.body.startLocation
    const endLocation = req.body.endLocation
    const distance = req.body.distance
  
 
 
 
 //check if route already exists
 Route.findOne({routeNumber:routeNumber})
 .then(route => {
     if(route)
     {
         console.log('Route already exists');
         res.status(409).json({error:'Route already exists'});
     }
     else
     {
    
       
 
                 const newRoute = new Route({
                    routeNumber:routeNumber,
                    routeName:routeName,
                    startLocation:startLocation,
                    endLocation:endLocation,
                    distance:distance
                    
                 });
 
                 newRoute.save()
                 .then(() => {
                     console.log('Route created');
                     res.status(201).json({message:'Route created'});
                 })
                 .catch(error => {
                     console.error('Error while saving the route:',error);
                     res.status(500).json({error:'Internal server error'});
                 });
 
 
 
             
          
 
     }
 })
 })
 
 //update bus route details
 router.put('/routes/:routeNumber', (req, res) => {
 
    const routeNumber = req.params.routeNumber
    const routeName = req.body.routeName
    const startLocation = req.body.startLocation
    const endLocation = req.body.endLocation
    const distance = req.body.distance
  
 

//check if route already exists
Route.findOne({routeNumber:routeNumber})
.then(route => {
    if(route)
    {

     route.routeNumber = routeNumber;
     route.routeName = routeName;
     route.startLocation = startLocation;
     route.endLocation = endLocation;
     route.distance = distance;
            
    
     route.save()
            .then(() => {
                console.log('Route updated');
                res.status(200).json({message:'Route updated'});
            })
            .catch(error => {
                console.error('Error while updating the route:',error);
                res.status(500).json({error:'Internal server error'});
            });
        
      

    }
    else
    {
        console.log('Route not found');
        res.status(404).json({error:'Route not found'});
    }
})

})

//delete route
router.delete('/routes/:routeNumber',(req,res)=>{
 
    const routeNumber = req.params.routeNumber

    Route.findOne({routeNumber:routeNumber})
    .then(route => {
        if(route)
        {
            route.deleteOne()
            .then(() => {
                console.log('Route deleted');
                res.status(200).json({message:'Route deleted'});
            })
            .catch(error => {
                console.error('Error while deleting the route:',error);
                res.status(500).json({error:'Internal server error'});
            })
        }
        else
        {
            console.log('Route not found')
            res.status(404).json({error:'Route not found'});
        }
    })
})




 
 module.exports = router;