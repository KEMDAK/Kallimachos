var AdminSeeder    = require('./AdminSeeder');
var LanguageSeeder = require('./LanguageSeeder');

/**
* This function seeds the predefined values into the database
* @param  {Function} callback callback function that is called once the seeding is done
* @ignore
*/
module.exports = function(callback){
    AdminSeeder(function(err) {
        if(err){
            callback(err);
        }
        else{
           LanguageSeeder(function(err) {
               if(err){
                   callback(err);
               }
               else{
                   callback();
               }
           });
        }
    });
};
