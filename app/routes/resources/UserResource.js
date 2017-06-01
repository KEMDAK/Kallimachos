/**
* This function configures the user routes of the application.
* @param  {express} app An instance of the express app to be configured.
*/
module.exports = function(app) {
    var UserController = require('../../controllers/UserController');
    var visitor        = require('../../middlewares/VisitorMiddleware');
    var auth           = require('../../middlewares/AuthMiddleware');
    var admin          = require('../../middlewares/AdminMiddleware');
    var activation     = require('../../middlewares/ActivationMiddleware');

    /**
    * A POST route responsible for storing a given user in the database (registiration).
    * @var /api/user POST
    * @name /api/user POST
    * @example The user requesting the route has to be a visitor (without Authorization token in the headers).
    * @example The route expects a body Object in the following format
    * {
    *    email: String,   [required]
    *    password: String [required (length between 6-20 characters)]
    * }
    * @example The route returns as a response an object in the following format
    * {
    *  status: succeeded/failed (String),
    *  message: String showing a descriptive text (String),
    *  errors:
    *  [
    *    {
    *       param: the field that caused the error (String),
    *       value: the value that was provided for that field (String),
    *       type: the type of error that was caused ['required', 'invalid', 'unique violation'] (String)
    *    }, {...}, ...
    *  ]
    * }
    */
    app.post('/api/user', visitor, UserController.store);

    /**
    * A PUT route responsible for updating the information of authenticated user
    * @var /api/user PUT
    * @name /api/user PUT
    * @example the route expects the access token as 'Authorization' and the user agent as 'user_agent' in the request headers with one of the following values ['Web', 'IOS', 'Android']
    * @example The route expects a body Object in the following format
    * {
    *    old_password: String, [required]
    *    new_password: String  [required (length between 6-20 characters)]
    * }
    * @example The route responds with an object having the following format
    * {
    *  status: succeeded/failed (String),
    *  message: String showing a descriptive text (String),
    *  errors:
    *  [
    *    {
    *       param: the field that caused the error (String),
    *       value: the value that was provided for that field (String),
    *       type: the type of error that was caused ['required', 'invalid'] (String)
    *    }, {...}, ...
    *  ]
    * }
    */
    app.put('/api/user', auth, UserController.update);

    /**
    * A DELETE route responsible for deleting user from the database and deleting his folder
    * @var /api/user/{id} DELETE
    * @name /api/user/{id} DELETE
    * @example The user requesting the route has to be of type 'Admin'.
    * @example the route expects the access token as 'Authorization' and the user agent as 'user_agent' in the request headers with one of the following values ['Web', 'IOS', 'Android']
    * @example The route expects the id of the desired user in the URL in replace of '{id}'
    * @example The route responds with an object having the following format
    * {
    *   status: succeeded/failed (String),
    *   message: String showing a descriptive text (String),
    *   errors:
    *   [
    *     {
    *        param: the field that caused the error (String),
    *        value: the value that was provided for that field (String),
    *        type: the type of error that was caused ['required', 'invalid', 'unique violation'] (String)
    *     }, {...}, ...
    *   ]
    * }
    */
    app.delete('/api/user/:id', auth, admin, UserController.delete);

    /**
    * A GET Route responsible for activating a user
    * @var /api/user/activate GET
    * @name /api/user/activate GET
    * @example The user requesting the route has to be a visitor (without Authorization token in the headers).
    * @example The route expects the Activation token in the query string as 'token'
    * @example The route responds with an object having the following format
    * {
    * 	status: succeeded/failed (String),
    *    message: String showing a descriptive text (String)
    * }
    */
    app.get('/api/user/activate', activation, visitor, UserController.activationState(1));

    /**
    * A GET route responsible for deactivating A user
    * @var /api/user/deactivate GET
    * @name /api/user/deactivate GET
    * @example the route expects the access token as 'Authorization' and the user agent as 'user_agent' in the request headers with one of the following values ['Web', 'IOS', 'Android']
    * @example The route responds with an object having the following format
    * {
    * 	status: succeeded/failed (String),
    *    message: String showing a descriptive text (String)
    * }
    */
    app.get('/api/user/deactivate', auth, UserController.activationState(2));

    /**
    * A GET route responsible for suspending A user
    * @var /api/user/{id}/suspend GET
    * @name /api/user/{id}/suspend GET
    * @example The user requesting the route has to be of type 'Admin'.
    * @example the route expects the access token as 'Authorization' and the user agent as 'user_agent' in the request headers with one of the following values ['Web', 'IOS', 'Android']
    * @example The route responds with an object having the following format
    * {
    * 	status: succeeded/failed (String),
    *    message: String showing a descriptive text (String)
    * }
    */
    app.get('/api/user/:id/suspend', auth, admin, UserController.activationState(3));

    /**
    * A GET route responsible for unsuspending A user
    * @var /api/user/{id}/unsuspend GET
    * @name /api/user/{id}/unsuspend GET
    * @example The user requesting the route has to be of type 'Admin'.
    * @example the route expects the access token as 'Authorization' and the user agent as 'user_agent' in the request headers with one of the following values ['Web', 'IOS', 'Android']
    * @example The route responds with an object having the following format
    * {
    * 	status: succeeded/failed (String),
    *    message: String showing a descriptive text (String)
    * }
    */
    app.get('/api/user/:id/unsuspend', auth, admin, UserController.activationState(0));
};
