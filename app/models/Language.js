/**
*  @mixin Language
*  @property {String} name The language's name
*/

/**
* This function defines the model Language
* @param  {Sequelize} sequelize this is the instance of Sequelize
* @ignore
*/
module.exports.defineLanguage = function(sequelize) {
   var Sequelize = require("sequelize");

   module.exports.Language = sequelize.define('language',{
      name: {
         type: Sequelize.STRING,
         allowNull: false,
         unique: true
      }
   },
   {
      underscored: true,
      underscoredALL: true
   });
};
