/**
* This is a middleware that validates that the user is an upper board member or higher
* @param  {HTTP}   req  The request object
* @param  {HTTP}   res  The response object
* @param  {Function} next Callback function that is called once the validation succeed
* @ignore
*/
module.exports = function(req, res, next)
{
   var log  = require('./LogMiddleware');

   if(req.user.isAdmin())
   {
      next();
   }
   else
   {
      res.status(403).json(
         {
            status:'failed',
            message: 'Access denied'
         });

      req.err = 'AdminMiddleware.js, Line: 24\nThe user tries to access a route that is only for Admins.';
      log.save(req, res);

   }
};
