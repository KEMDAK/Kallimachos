var mysql = require('mysql');
var Sequelize = require('sequelize');

/* Connecting to the database. */
var db_name = process.env.DB_NAME + '_' + process.env.ENV;

var sequelize = new Sequelize(db_name, process.env.DB_USER, process.env.DB_PASS,
{
   host: process.env.DB_HOST,
   dialect: 'mysql',
   port:    3306,
   logging: (process.env.SQL_LOG === 'true')? console.log : false,
   define: {
      charset: 'utf8'
   }
});
module.exports.Seq = sequelize ;
module.exports.initialize = function(callback) {

   /* define the models */
   require('../../app/models/Log').defineLog(sequelize);
   require('../../app/models/User').defineUser(sequelize);
   require('../../app/models/Identity').defineIdentity(sequelize);

   /* defining relation */
   require('../../app/models/Relations');

   var force = (process.env.RESET_DB === 'true')? true : false;

   sequelize.sync({ force: force }).then(function(err) {
      /* seeding */
      require('./seeders/Seeder')(function(err) {
         if(err){
            callback(err);
         }
         else{
            callback(null);
         }
      });
   }, function (err) {
      callback(err);
   });
};
