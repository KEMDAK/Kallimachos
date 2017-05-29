/**
* This function seeds the predefined Lanuages into the database
* @param  {Function} callback callback function that is called once the seeding is done
* @ignore
*/
module.exports = function(callback){
	var Language  = require('../../../app/models/Language').Language;
	var languages = require('../../data/Languages.json');

	Language.bulkCreate(languages, { updateOnDuplicate : ['name'] }).then(function() {
		callback();
	}).catch(function(err) {
		callback(err);
	});
};
