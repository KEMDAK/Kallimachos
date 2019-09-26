var jwt        = require('jsonwebtoken');
var nodemailer = require('nodemailer');

module.exports.errorFormat = function(errors) {
   if (errors) {
      for (var i = 0; i < errors.length; i++) {
         errors[i].type = errors[i].msg;
         delete errors[i].msg;
      }

      return errors;
   }
};

module.exports.generateJWTToken = function(id, type, duration) {
   /* generating the exp_date */
   var exp_date = new Date();
   exp_date.setDate(exp_date.getDate() + duration);

   /* generating a verification token */
   var payload = {
      type: (type + '-token'),
      userId: id,
      exp: exp_date.getTime()
   };

   var token = jwt.sign(payload, process.env.JWTSECRET);

   return token;
};

module.exports.sendMail = {};

module.exports.sendMail.activation = function(user) {
   var token = module.exports.generateJWTToken(user.id, 'activation', 1);

   /* Sending a activation mail */ //TODO

   user.activation_token = token;
   user.save();
};

module.exports.sendMail.resetPassword = function(user) {
   var token = module.exports.generateJWTToken(user.id, 'reset', 1);

   /* Sending the reset mail */ //TODO

   user.reset_token = token;
   user.save();
};
