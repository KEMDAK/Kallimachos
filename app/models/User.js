/**
*  @mixin User
*  @property {String} type The users's account type ('Admin', 'Member')
*  @property {String} email The users's email
*  @property {String} password The users's password
*  @property {Integer} active The user's account state [0 => New User Pending activation, 1 => Activated user, 2 => User deactivated his account, 3 => Suspended User]
*  @property {String} activation_token The activation token of the user that could be used to activate the account
*  @property {String} reset_token The reset token of the user that could be used to reset the password
*/

/**
* This Function define the model of the user Object
* @param  {sequelize} connection the instance of the sequelize Object
* @ignore
*/
module.exports.defineUser = function(sequelize) {
   var Sequelize = require("sequelize");
   var bcrypt = require('bcrypt-nodejs');

   module.exports.User = sequelize.define('user', {
      type: {
         type: Sequelize.ENUM('Admin', 'Member'),
         allowNull: false
      },
      email: {
         type: Sequelize.STRING,
         unique: true,
         allowNull: false
      },
      password: {
         type: Sequelize.STRING,
         set: function(value){
            this.setDataValue('password', bcrypt.hashSync(value));
         },
         allowNull: false
      },
      active: {
         type: Sequelize.INTEGER(1),
         allowNull: false
      },
      activation_token: {
         type: Sequelize.STRING(700),
         allowNull: true
      },
      reset_token: {
         type: Sequelize.STRING(700),
         allowNull: true
      }
   },
   {
      underscored: true,
      underscoredAll: true,
      instanceMethods:
      /** @lends User.prototype */
      {
         /**
         * This function activates the user.
         * @param  {Function(err)} callback Callback function that is called once the activation is done.
         */
         activate: function(callback) {
            this.active = '1';
            this.save().then(function (user) {
               callback();
            }).catch(function(err){
               if(callback){
                  callback(err);
               }
            });
         },

         /**
         * This function deactivates the user.
         * @param  {Function(err)} callback Callback function that is called once the deactivation is done.
         */
         deactivate: function(callback) {
            this.active = '2';
            this.save().then(function (user) {
               callback();
            }).catch(function(err){
               if(callback){
                  callback(err);
               }
            });
         },

         /**
         * This function suspends the user.
         * @param  {Function(err)} callback Callback function that is called once the user is suspended.
         */
         suspend: function(callback) {
            this.active = '3';
            this.save().then(function (user) {
               callback();
            }).catch(function(err){
               if(callback){
                  callback(err);
               }
            });
         },

         /**
         * This function nullifies the avtivation token of the user.
         * @param  {Function(err)} callback Callback function that is called once the nullification is done.
         */
         nullifyActivationToken: function(callback) {
            this.activattion_token = null;
            this.save().then(function (err) {
               if(callback){
                  callback(err);
               }
            });
         },
         /**
         * This function nullifies the reset token of the user.
         * @param  {Function(err)} callback Callback function that is called once the nullification is done.
         */
         nullifyResetToken: function(callback) {
            this.reset_token = null;
            this.save().then(function (err) {
               if(callback){
                  callback(err);
               }
            });
         },

         /**
         * This function validates the password of the user.
         * @param  {String} password the claimed password.
         * @return {Boolean} true if the claimed password matches the real one.
         */
         validPassword: function(password) {
            return bcrypt.compareSync(password, this.password);
         },

         /**
         * This function checks if the user is an Admin.
         * @return {Boolean} true if user is an Admin.
         */
         isAdmin: function() {
            return this.type === 'Admin';
         },

         /**
         * This function checks if the user is a Member.
         * @return {Boolean} true if user is a Member.
         */
         isMember: function() {
            return this.type === 'Member';
         },

         /**
         * this function nreturns the user object.
         * @return {Object} The user object.
         */
        toJSON: function() {
           var res = {};

           res.id = this.id;
           res.type = this.type;
           res.email = this.email;

           return res;
        }
      }
   });
};
