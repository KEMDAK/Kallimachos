/**
* This function configures the authentication routes of the application.
* @param  {express} app An instance of the express app to be configured.
*/
module.exports = function(app) {
    var AuthController = require('../../controllers/AuthController');
    var visitor        = require('../../middlewares/VisitorMiddleware');
    var auth           = require('../../middlewares/AuthMiddleware');
    var reset          = require('../../middlewares/ResetMiddleware');

    /**
    * A POST route responsible for logging an existing user in
    * @var /api/login POST
    * @name /api/login POST
    * @example The user requesting the route has to be a visitor (without Authorization token in the headers).
    * @example the route expects the user agent as 'user_agent' in the request headers with one of the following values ['Web', 'IOS', 'Android']
    * @example The route expects a body Object in the following format
    * {
    *   email: String,   [required]
    *   password: String [required]
    * }
    * @example The route returns as a response an object in the following format
    * {
    * 	status: succeeded/failed (String),
    * 	message: String showing a descriptive text (String),
    * 	token: access token as a response to a successfull login (String),
    * 	user:
    * 	{
    *       id: the user id (Integer),
    *       type: the type of the account ['Admin', 'Member'] (String),
    *       email: the logged in user email (String)
    *    }
    * 	error:
    * 	[
    * 	  {
    * 	     param: the field that caused the error (String),
    * 	     value: the value that was provided for that field (String),
    * 	     type: the type of error that was caused ['required', 'invalid'] (String)
    * 	  }, {...}, ...
    * 	]
    *   }
    */
    app.post('/api/login', visitor, AuthController.login);

    /**
    * A GET route to log a user out
    * @var /api/logout GET
    * @name /api/logout GET
    * @example the route expects the access token as 'Authorization' and the user agent as 'user_agent' in the request headers with one of the following values ['Web', 'IOS', 'Android']
    * @example The route respond with a json Object having the following format
    * {
    * 	status: succeeded/failed (String),
    * 	message: String showing a descriptive text (String)
    * }
    */
    app.get('/api/logout', auth, AuthController.logout);

    /**
    * A POST request responsible for sending an email to the user containing a link to reset the user's password
    * @var /api/forgotPassword POST
    * @name /api/forgotPassword POST
    * @example The user requesting the route has to be a visitor (without Authorization token in the headers).
    * @example The route expects a body Object with the following format
    * {
    * 	email: String [required]
    * }
    * @example The route responds with an object having the following format
    * {
    * 	status: succeeded/failed (String),
    * 	message: String showing a descriptive text (String),
    * 	error:
    * 	[
    * 	  {
    * 	     param: the field that caused the error (String),
    * 	     value: the value that was provided for that field (String),
    * 	     type: the type of error that was caused ['required', 'invalid'] (String)
    * 	  }, {...}, ...
    * 	]
    * }
    */
    app.post('/api/forgotPassword', visitor, AuthController.forgotPassword);

    /**
    * A POST route responsible for resetting a user's password in the database
    * @var /api/resetPassword POST
    * @name /api/resetPassword POST
    * @example The user requesting the route has to be a visitor (without Authorization token in the headers).
    * @example The route expects the reset token in the query string as 'token'
    * @example The route expects a body object with the following format
    * {
    * 	password: String [required (length between 6-20 characters)]
    * }
    * @example The route responds with an object having the following format
    * {
    * 	status: succeeded/failed (String),
    * 	message: Descriptive text about the errors (String),
    * 	error:
    * 	[
    * 	  {
    * 	     param: the field that caused the error (String),
    * 	     value: the value that was provided for that field (String),
    * 	     type: the type of error that was caused ['required', 'invalid'] (String)
    * 	  }, {...}, ...
    * 	]
    * }
    */
    app.post('/api/resetPassword', visitor, reset, AuthController.resetPassword);
};
