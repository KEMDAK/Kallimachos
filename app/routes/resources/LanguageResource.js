/**
* This function configures the language routes of the application.
* @param  {express} app An instance of the express app to be configured.
*/
module.exports = function(app) {
   var LanguageController = require('../../controllers/LanguageController');
   var auth               = require('../../middlewares/AuthMiddleware');

   /**
   * A GET route responsible for indexing the Languages availble in the system.
   * @var /api/book GET
   * @name /api/book GET
   * @example the route expects the access token as 'Authorization' and the user agent as 'user_agent' in the request headers with one of the following values ['Web', 'IOS', 'Android']
   * @example The route returns as a response an object in the following format
   * {
   * 	status: succeeded/failed (String),
   * 	message: String showing a descriptive text (String),
   * 	languages:
   * 	[
   * 	  {
   * 	     id: the book's id (Integer),
   * 	     name: the language name (String)
   * 	  }, {...}, ...
   * 	]
   * }
   */
   app.get('/api/language', auth, LanguageController.index);
};
