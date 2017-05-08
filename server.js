/* loading the environment variables */
require('dotenv').config({silent: true});

var express          = require('express');
var app              = express();
var bodyParser       = require('body-parser');
var expressValidator = require('express-validator');
var methodOverride   = require('method-override');
var db               = require('./config/database/Database');

// connect to our database and initialize models
db.initialize(function(err) {
   if(err) {
      console.log('Unable to start the application duo to: ', err);
      process.exit(1);
   }
   else {
      console.log('Connected successfully to MySQL database: ' + process.env.DB_NAME + '_' + process.env.ENV +  '@' + process.env.DB_HOST);

      //* serving static files */
      app.use(express.static('public/images/'));
      app.use('/api', express.static('documentation/' + require('./package.json').name + '/' + require('./package.json').version + '/'));
      /* setting up body parser */
      app.use(bodyParser.json());
      app.use(bodyParser.urlencoded({ extended: false }));
      app.use(function (error, req, res, next) {
         if (error instanceof SyntaxError) {
            res.status(400).json({
               status: 'failed',
               message: "Enter a valid JSON object."
            });
         } else {
            next();
         }
      });
      /*setting up express-validator package */
      var validators = require('./app/CustomValidators');
      app.use(expressValidator(validators));
      /* setting up the app to accept (DELETE, PUT...etc requests) */
      app.use(methodOverride());

      /* initializing routes */
      require('./app/routes/Routes.js')(app);

      /* listening to requests */
      var port    = (process.env.ENV === 'prod')? 80 : process.env.PORT;
      app.listen(port, function() {
         console.log('The server is up and running on the following route: ' + 'http://' + process.env.DOMAIN + ':' + port);
      });
   }
});
