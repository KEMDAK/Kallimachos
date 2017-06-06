/**
* @module Book Controller
* @description The controller that is responsible of handling Language's requests
*/

var Language = require('../models/Language').Language;

/**
* This function gets a list of all languages available in the database.
* @param  {HTTP}   req  The request object
* @param  {HTTP}   res  The response object
* @param  {Function} next Callback function that is called once done with handling the request
*/
module.exports.index = function(req, res, next) {
   Language.findAll({ attributes: ['id', 'name'] }).then(function(languages) {
      res.status(200).json({
         status: 'succeeded',
         languages: languages
      });

      next();
   }).catch(function(err) {
      /* failed to find the languages in the database */
      res.status(500).json({
         status:'failed',
         message: 'Internal server error'
      });

      req.err = 'LanguageController.js, Line: 29\nCouldn\'t retreive the languages from the database.\n' + String(err);

      next();
   });
};
