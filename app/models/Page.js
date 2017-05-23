/**
*  @mixin Page
*  @property {String} language The page's language
*  @property {String} name The page's name
*  @property {Integer} number The page's number in the book
*  @property {image} image The page's image absolute url
*  @property {Text} text_ocr The OCR output of the page's content
*  @property {Text} text_mc The manually corrected page's content
*  @property {Text} text_gt The ground truth of the page's content
*/

/**
* This function defines the model Page
* @param  {Sequelize} sequelize this is the instance of Sequelize
* @ignore
*/
module.exports.definePage = function(sequelize) {
   var Sequelize = require("sequelize");

   module.exports.Page = sequelize.define('page',{
      language: {
         type: Sequelize.STRING,
         allowNull: false
      },
      number: {
         type: Sequelize.INTEGER,
         allowNull: false,
         unique: 'uniquePage'
      },
      image: {
         type: Sequelize.STRING(300),
         allowNull: false
      },
      text_ocr: {
         type: Sequelize.TEXT,
         allowNull: false
      },
      text_mc: {
         type: Sequelize.TEXT,
         allowNull: true
      },
      text_gt: {
         type: Sequelize.TEXT,
         allowNull: true
      }
   },
   {
      underscored: true,
      underscoredALL: true
   });
};
