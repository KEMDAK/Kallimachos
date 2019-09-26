/**
* @module Auth Controller
* @description The controller that is responsible of handling requests that deals with authentication.
*/

var User             = require('../models/User').User;
var Identity         = require('../models/Identity').Identity;
var jwt              = require('jsonwebtoken');
var generateJWTToken = require('../scripts').generateJWTToken;
var errorFormat      = require('../scripts').errorFormat;
var sendMail         = require('../scripts').sendMail;

/**
* This function recieves and handles login request
* @param  {HTTP}   req  The request object
* @param  {HTTP}   res  The response object
* @param  {Function} next Callback function that is called once done with handling the request
*/
module.exports.login = function(req, res, next) {
   /*Validate and sanitizing email Input*/
   req.checkBody('email', 'required').notEmpty();
   req.checkBody('email', 'invalid').isEmail();
   req.sanitizeBody('email').escape();
   req.sanitizeBody('email').trim();
   req.sanitizeBody('email').normalizeEmail({ lowercase: true });
   /*Validate and sanitizing Password Input*/
   req.checkBody('password', 'required').notEmpty();
   /*Validate and sanitizing User Agent*/
   req.checkHeaders('user_agent', 'required').notEmpty();
   req.checkHeaders('user_agent', 'invalid').isIn(['Web', 'Android', 'IOS']);
   req.sanitizeHeaders('user_agent').escape();

   var errors = req.validationErrors();
   errors = errorFormat(errors);
   if (errors) {
      /* input validation failed */
      res.status(400).json({
         status: 'failed',
         errors: errors
      });

      req.err = 'AuthController.js, Line: 42\nSome validation errors occured.\n' + JSON.stringify(errors);

      next();

      return;
   }

   var email = req.body.email;
   var password = req.body.password;

   /* search for the user */
   User.findOne({ where: { email: email } }).then(function(user) {
      if (!user) {
         /* user was not found */
         res.status(401).json({
            status: 'failed',
            message: 'The provided credentials are not correct'
         });

         req.err = 'AuthController.js, Line: 61\nUser was not found in the database.';

         next();
      } else {
         /* Adding the user to the request object */
         req.user = user;

         /* validating the users password */
         if (user.validPassword(password)) {
            /* user successfully authenticated */

            /* check if the account is activated */
            if(user.active === 0){
               /* sending activation mail */
               sendMail.activation(user);

               res.status(202).json({
                  status:'succeeded',
                  message: 'The provided account needs to be activated first.'
               });

               next();

               return;
            }
            else if(user.active === 2){
               user.activate();
            }
            else if(user.active === 3){
               res.status(403).json({
                  status: 'failed',
                  message: 'Access denied, The account is susspended. Please contact the customer support.'
               });

               req.err = 'AuthController.js, Line: 95\nThe account is susspended.\n';

               next();

               return;
            }

            user.nullifyResetToken();

            var userAgent = req.headers.user_agent;

            Identity.findOne({ where: { user_agent: userAgent, user_id: user.id } }).then(function(identity) {
               var generateIdentity = function () {
                  var token = generateJWTToken(user.id, 'login', 90);

                  var identityInstance = Identity.build({
                     token: token,
                     token_exp_date: (new Date().setDate(new Date().getDate() + 90)),
                     user_agent: userAgent,
                     last_logged_in: new Date(),
                     user_id: user.id
                  });

                  identityInstance.save().then(function(identity) {
                     /* Adding the authenticated user identity to the request object */
                     req.identity = identity;

                     res.status(200).json({
                        status: 'succeeded',
                        token: token,
                        user: user
                     });

                     next();
                  }).catch(function(err) {
                     /* failed to save the user identity in the database */
                     res.status(500).json({
                        status: 'failed',
                        message: 'Internal server error'
                     });

                     req.err = 'AuthController.js, Line: 136\nFailed to save the user identity in the database.\n' + err;

                     next();
                  });
               };

               if (identity) {
                  /* found a valid identity */
                  try {
                     jwt.verify(identity.token, process.env.JWTSECRET);

                     /* Adding the authenticated user identity to the request object */
                     req.identity = identity;

                     res.status(200).json({
                        status: 'succeeded',
                        token: identity.token,
                        user: user
                     });

                     next();

                     identity.last_logged_in = new Date();
                     identity.save();
                  } catch (err) {
                     identity.destroy();
                     generateIdentity();
                  }
               } else {
                  generateIdentity();
               }
            }).catch(function(err) {
               /* failed duo to an error in the database while trying to find the identity */
               res.status(500).json({
                  status: 'failed',
                  message: 'Internal server error'
               });

               req.err = 'AuthController.js, Line: 174\nFailed duo to an error in the database while trying to find the identity.\n' + err;

               next();
            });
         } else {
            /* password mismatch */
            res.status(401).json({
               status: 'failed',
               message: 'The provided credentials are not correct'
            });

            req.err = 'AuthController.js, Line: 185\nThe provided password doesn\'t match the database.\n';

            next();
         }
      }
   });
};

/**
* This function handles /logout get request by removing the corresponding identity from the database
* @param  {HTTP}   req The request Object
* @param  {HTTP}   res The response Object
* @param  {Function} next Callback function that is called once done with handling the request
*/
module.exports.logout = function (req, res, next){
   //delete the identity from the database
   req.identity.destroy().then(function(){
      delete req.identity;

      res.status(200).json({
         status:'succeeded'
      });

      next();
   }).catch(function(err){
      /* failed to destroy the identity in the database */
      res.status(500).json({
         status:'failed',
         message: 'Internal server error'
      });

      req.err = 'AuthController.js, Line: 216\nFailed to destroy the identity in the database\n' + err;

      next();
   });
};

/**
* This function recieves and handles forgot password request
* @param  {HTTP}   req  The request object
* @param  {HTTP}   res  The response object
* @param  {Function} next Callback function that is called once done with handling the request
*/
module.exports.forgotPassword = function (req, res, next) {
   /*Validate and sanitizing email Input*/
   req.checkBody('email', 'required').notEmpty();
   req.checkBody('email', 'invalid').isEmail();
   req.sanitizeBody('email').escape();
   req.sanitizeBody('email').trim();
   req.sanitizeBody('email').normalizeEmail({ lowercase: true });

   var errors = req.validationErrors();
   errors = errorFormat(errors);
   if (errors) {
      /* input validation failed */
      res.status(400).json({
         status: 'failed',
         errors: errors
      });

      req.err = 'AuthController.js, Line: 245\nSome validation errors occured.\n' + JSON.stringify(errors);

      next();

      return;
   }

   /* extracting data from the request body */
   var email     = req.body.email;

   /* search for the user */
   User.findOne({ where: {email: email} }).then(function(user) {
      if(user){
         /* Adding the user to the request object */
         req.user = user;

         /* Sending the reset mail */
         sendMail.resetPassword(user);

         /* request handled */
         res.status(200).json({
            status: 'succeeded'
         });

         next();
      } else{
         req.err = 'AuthController.js, Line: 271\nThe requested user was not found in the database.\n';

         /* request handled */
         res.status(200).json({
            status: 'succeeded'
         });

         next();
      }
   }).catch(function(err){

      /* failed to find the user in the database */
      res.status(500).json({
         status:'failed',
         message: 'Internal server error'
      });

      req.err = 'AuthController.js, Line: 288\nFailed to find the user in the database.\n' + err;

      next();
   });
};

/**
* This function recieves and handles reset password request
* @param  {HTTP}   req  The request object
* @param  {HTTP}   res  The response object
* @param  {Function} next Callback function that is called once done with handling the request
*/
module.exports.resetPassword = function (req, res, next) {
   /*Validate and sanitizing Password  Input*/
   req.checkBody('password', 'required').notEmpty();
   req.assert('password', 'invalid').len(6, 20);

   var errors = req.validationErrors();
   errors = errorFormat(errors);
   if (errors) {
      /* input validation failed */
      res.status(400).json({
         status: 'failed',
         errors: errors
      });

      req.err = 'AuthController.js, Line: 314\nSome validation errors occured.\n' + JSON.stringify(errors);

      next();

      return;
   }

   /* extracting data from the request body */
   var password     = req.body.password;

   /* search for the user */
   User.findById(req.payload.userId).then(function(user) {
      if(!user){
         /* User not found */
         res.status(404).json({
             status:'failed',
             message: 'The requested route was not found.'
         });

         req.err = 'AuthController.js, Line: 333\nThe user was not found in the database.\n';

         next();
      }
      else{
         user.password = password;
         user.reset_token = null;
         user.save().then(function(user){
            /* request handled */
            res.status(200).json({
               status: 'succeeded'
            });

            next();
         }).catch(function(err){

            /* failed to change the password in the database */
            res.status(500).json({
               status:'failed',
               message: 'Internal server error'
            });

            req.err = 'AuthController.js, Line: 355\nFailed to change the password in the database.\n' + err;

            next();
         });
      }
   }).catch(function(err){

      /* failed to find the user in the database */
      res.status(500).json({
         status:'failed',
         message: 'Internal server error'
      });

      req.err = 'AuthController.js, Line: 368\nFailed to find the user in the database.\n' + err;

      next();
   });
};
