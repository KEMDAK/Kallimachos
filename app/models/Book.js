/**
*  @mixin Book
*  @property {String} language The book's language
*  @property {String} title The book's title
*  @property {Integer} pages_count The book's number of pages
*  @property {Boolean} gt_exists The state  of existance of the ground truth
*  @property {Boolean} lm_exists The state  of existance of the lanuage model
*  @property {Integer} start_set The number of the start page of the training set
*  @property {Integer} end_set The number of the end page of the training set
*/

/**
* This function defines the model Book
* @param  {Sequelize} sequelize this is the instance of Sequelize
* @ignore
*/
module.exports.defineBook = function(sequelize) {
   var Sequelize = require("sequelize");

   module.exports.Book = sequelize.define('book',{
      lanuage: {
         type: Sequelize.STRING,
         allowNull: false
      },
      title: {
         type: Sequelize.STRING,
         allowNull: false
      },
      pages_count: {
         type: Sequelize.INTEGER,
         allowNull: false
      },
      gt_exists: {
         type: Sequelize.BOOLEAN,
         allowNull: false
      },
      lm_exists: {
         type: Sequelize.BOOLEAN,
         allowNull: false
      },
      start_set: {
         type: Sequelize.INTEGER,
         allowNull: false
      },
      end_set: {
         type: Sequelize.INTEGER,
         allowNull: false
      }
   },
   {
      underscored: true,
      underscoredALL: true
   });
};
