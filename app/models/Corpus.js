/**
*  @mixin Corpus
*  @property {String} data the content of this corpus page
*/

/**
* This function defines the model Corpus
* @param  {Sequelize} sequelize this is the instance of Sequelize
* @ignore
*/
module.exports.defineCorpus = function(sequelize) {
   var Sequelize = require("sequelize");

   module.exports.Corpus = sequelize.define('corpus',{
      data: {
         type: Sequelize.TEXT,
         allowNull: false,
      }
   },
   {
      underscored: true,
      underscoredALL: true
   });
};
