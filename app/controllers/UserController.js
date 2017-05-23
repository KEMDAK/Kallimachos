/**
* @module User Controller
* @description The controller that is responsible of handling user's requests
*/

var User        = require('../models/User').User;
var errorFormat = require('../scripts').errorFormat;
var sendMail    = require('../scripts').sendMail;

/**
* This function stores the provided user in the database
* @param  {HTTP}   req  The request object
* @param  {HTTP}   res  The response object
* @param  {Function} next Callback function that is called once done with handling the request
*/
module.exports.store = function(req, res, next) {

   /*Validate and sanitizing email Input*/
   req.checkBody('email', 'required').notEmpty();
   req.checkBody('email', 'invalid').isEmail();
   req.sanitizeBody('email').escape();
   req.sanitizeBody('email').trim();
   req.sanitizeBody('email').normalizeEmail({ lowercase: true });

   /*Validate password Input*/
   req.checkBody('password', 'required').notEmpty();
   req.checkBody('password', 'invalid').len(6, 20);

   var errors = req.validationErrors();
   errors = errorFormat(errors);
   if (errors) {
      /* input validation failed */
      res.status(400).json({
         status: 'failed',
         errors: errors
      });

      req.err = 'UserController.js, Line: 38\nSome validation errors occured.\n' + JSON.stringify(errors);

      next();

      return;
   }

   var obj = {
      type : 'Member',
      email : req.body.email,
      password :  req.body.password,
      active: 0
   };

   User.create(obj).then(function(user) {
      /* Sending the activation mail */
      sendMail.activation(user);

      res.status(200).json({
         status: 'succeeded',
         message: 'Registration completed.'
      });

      next();
   }).catch(function(err) {
      if (err.message === 'Validation error') {
         /* The user violated database constraints */
         var errors = [];
         for (var i = 0; i < err.errors.length; i++) {
            var curError = err.errors[i];

            errors.push({
               param: curError.path,
               value: curError.value,
               type: curError.type
            });
         }

         res.status(400).json({
            status:'failed',
            error: errors
         });

         req.err = 'UserController.js, Line: 81\nThe user violated some database constraints.\n' + JSON.stringify(errors);
      }
      else {
         /* failed to save the user in the database */
         res.status(500).json({
            status:'failed',
            message: 'Internal server error'
         });

         req.err = 'UserController.js, Line: 90\nCouldn\'t save the user in the database.\n' + String(err);
      }

      next();
   });
};

/**
* This function updates a user's information in the database
* @param  {HTTP}   req  The request object
* @param  {HTTP}   res  The response object
* @param  {Function} next Callback function that is called once done with handling the request
*/
module.exports.update = function(req, res, next) {
   /*Validate old Password Input*/
   req.checkBody('old_password', 'required').notEmpty();

   /*Validate password Input*/
   req.checkBody('new_password', 'required').notEmpty();
   req.checkBody('new_password', 'invalid').len(6, 20);

   var errors = req.validationErrors();
   errors = errorFormat(errors);
   if (errors) {
      /* input validation failed */
      res.status(400).json({
         status: 'failed',
         errors: errors
      });

      req.err = 'UserController.js, Line: 120\nSome validation errors occured.\n' + JSON.stringify(errors);

      next();

      return;
   }

   if (!req.user.validPassword(req.body.old_password)) {
      res.status(403).json({
         status: 'failed',
         message: 'The provided credentials are not correct'
      });

      req.err = 'UserController.js, Line: 133\nThe old password doesn\'t match the password in the database.';

      next();

      return;
   }

   var id  =  req.user.id ;
   var obj = {
      password: req.body.new_password
   };

   User.update(obj, { where : { id : id } }).then(function(affected) {
      if (affected[0] == 1) {
         res.status(200).json({
            status: 'succeeded',
            message: 'Update completed.'
         });
      }
      else {
         res.status(404).json({
            status:'failed',
            message: 'The requested route was not found.'
         });

         req.err = 'UserController.js, Line: 158\nThe requested user was not found in the database.\n';
      }

      next();
   }).catch(function(err) {
      /* failed to update the user in the database */
      res.status(500).json({
         status:'failed',
         message: 'Internal server error'
      });

      req.err = 'UserController.js, Line: 169\nCouldn\'t update the user in the database.\n' + String(err);

      next();
   });
};

/**
* This function deletes a user from the database
* @param  {HTTP}   req  The request object
* @param  {HTTP}   res  The response object
* @param  {Function} next Callback function that is called once done with handling the request
*/
module.exports.delete = function(req, res, next) {
   /*Validate and sanitizing ID Input*/
   req.checkParams   ('id','required').notEmpty();
   req.sanitizeParams('id').escape();
   req.sanitizeParams('id').trim();
   req.checkParams   ('id','invalid').isInt();

   var errors = req.validationErrors();
   errors = errorFormat(errors);
   if (errors) {
      /* input validation failed */
      res.status(400).json({
         status: 'failed',
         errors: errors
      });

      req.err = 'UserController.js, Line: 197\nSome validation errors occurred.\n' + JSON.stringify(errors);

      next();

      return;
   }

   var id = req.params.id;

   User.findById(id).then(function(user){
      if(!user){
         res.status(404).json({
            status: 'failed',
            message: 'The requested route was not found.'
         });

         req.err = 'UserController.js, Line: 213\nThe specified User is not found in the database.\n';

         next();
      }else{
         if(!user.isAdmin()){
            user.destroy().then(function(){
               delete req.user ;
               delete req.identity;
               res.status(200).json({
                  status:  'succeeded',
                  message: 'The User has been deleted.'
               });

               next();
            }).catch(function(err){
               /* failed to delete the user from the database */
               res.status(500).json({
                  status:'failed',
                  message: 'Internal server error'
               });

               req.err = 'UserController.js, Line: 234\nCan not delete the User from the database.\n' + String(err);

               next();
            });
         }
         else {
            res.status(403).json({
               status:'failed',
               message: 'Access Denied'
            });

            req.err = 'UserController.js, Line: 245\ncan not delete an admin or (upper board if req.user is upperboard)\n';

            next();
         }

      }
   }).catch(function(err){
      /* failed to find the user in the database */
      res.status(500).json({
         status:'failed',
         message: 'Internal server error'
      });

      req.err = 'UserController.js, Line: 258\nCan not find the User in the database.\n' + String(err);

      next();
   });
};

/**
* This function updates a user's account state.
* @param  {HTTP}   req  The request object
* @param  {HTTP}   res  The response object
* @param  {Function} next Callback function that is called once done with handling the request
*/
module.exports.activationState = function(state) {
   return function(req, res, next) {
      var id = req.user.id;

      if(state === 3 || state === 0) {
         /*Validate and sanitizing ID Input*/
         req.checkParams   ('id','required').notEmpty();
         req.sanitizeParams('id').escape();
         req.sanitizeParams('id').trim();
         req.checkParams   ('id','invalid').isInt();
         id = req.params.id;
      }

      var errors = req.validationErrors();
      errors = errorFormat(errors);
      if (errors) {
         /* input validation failed */
         res.status(400).json({
            status: 'failed',
            errors: errors
         });

         req.err = 'UserController.js, Line: 292\nSome validation errors occured.\n' + JSON.stringify(errors);

         next();

         return;
      }

      var obj = {
         active: state,
         activation_token: null
      };

      var where = { id : id };
      if(state === 0) {
         where.active = 3;
      }

      User.update(obj, { where : where }).then(function(affected) {
         if (affected[0] == 1) {
            res.status(200).json({
               status: 'succeeded'
            });
         }
         else {
            res.status(404).json({
               status:'failed',
               message: 'The requested route was not found.'
            });

            req.err = 'UserController.js, Line: 321\nThe requested user was not found in the database.\n';
         }

         next();
      }).catch(function(err) {
         /* failed to update the user in the database */
         res.status(500).json({
            status:'failed',
            message: 'Internal server error'
         });

         req.err = 'UserController.js, Line: 332\nCouldn\'t update the user in the database.\n' + String(err);

         next();
      });
   };
};
