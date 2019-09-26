/**
* This is a middleware that validates the activation token
* @param  {HTTP}   req  The request object
* @param  {HTTP}   res  The response object
* @param  {Function} next Callback function that is called once the validation succeed
* @ignore
*/
module.exports = function(req, res, next) {
   var jwt  = require('jsonwebtoken');
   var User = require('../models/User').User;
   var log  = require('./LogMiddleware');

   /* getting the token from the http headers */
   var token = req.query.token;

   /* getting the JWT seacret from the environment variables */
   var secret = process.env.JWTSECRET;

   try
   {
      /* validating the token */
      var payload = jwt.verify(token, secret);

      if(payload.type !== 'activation-token'){
         /* The used token is not for activation */
         throw "The used token is not for activation";
      }

      /* checking to see if this is the expected token */
      User.findById(payload.userId).then(function(user) {
         if(token !== user.activation_token){
            /* The used token is not the one expected */
            throw "The used token is not the one expected";
         }

         /* Adding the authenticated user to the request object */
         req.user = user;

         /* The token has been validated successfully */
         req.payload = payload;

         next();
      }).catch(function(err){
         if(err === "The used token is not the one expected"){
            /* The token failed the validation */
            res.status(404).json({
               status:'failed',
               message: 'The requested route was not found.'
            });
         }
         else {
            /* failed to find the user in the database */
            res.status(500).json({
               status:'failed',
               message: 'Internal server error'
            });
         }

         req.err = 'ActivationMiddleware.js, Line: 59\nFailed to find the user in the database.\n' + err;

         log.save(req, res);
      });
   }
   catch (err)
   {
      /* The token failed the validation */
      res.status(404).json({
         status:'failed',
         message: 'The requested route was not found.'
      });

      req.err = 'ActivationMiddleware.js, Line: 72\nThe token failed the validation.\n' + err;

      log.save(req, res);
   }
};
