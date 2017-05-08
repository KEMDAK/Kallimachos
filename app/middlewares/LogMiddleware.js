/**
* This is a middleware that logs the incoming request
* @param  {HTTP}   req  The request object
* @param  {HTTP}   res  The response object
* @param  {Function} next Callback function that is called once the logging is done
* @ignore
*/
module.exports.init = function(req, res, next) {
    req.startTime = new Date();

    /* overridding res.json */
    res.json = function json(obj) {
        var val = obj;

        // allow status / body
        if (arguments.length === 2) {
            // res.json(body, status) backwards compat
            if (typeof arguments[1] === 'number') {
                deprecate('res.json(obj, status): Use res.status(status).json(obj) instead');
                this.statusCode = arguments[1];
            } else {
                deprecate('res.json(status, obj): Use res.status(status).json(obj) instead');
                this.statusCode = arguments[0];
                val = arguments[1];
            }
        }

        // settings
        var app = this.app;
        var replacer = app.get('json replacer');
        var spaces = app.get('json spaces');
        var body = JSON.stringify(val, replacer, spaces);

        // content-type
        if (!this.get('Content-Type')) {
            this.set('Content-Type', 'application/json');
        }

        res.body = obj;

        return this.send(body);
    };

    next();
};

/**
* This is a middleware that logs the incoming request
* @param  {HTTP}   req  The request object
* @param  {HTTP}   res  The response object
* @param  {Function} next Callback function that is called once the logging is done
* @ignore
*/
module.exports.save = function(req, res) {
    var Log = require('../models/Log').Log;

    var record = {};

    record.method = req.method;
    record.route = req.path;
    record.response_time = (new Date().getTime()) - (req.startTime.getTime());
    record.status = res.statusCode;
    record.ip = req.ip;

    record = Log.build(record);

    if(req.identity){
        record.identity_id = req.identity.id;
    }
    else{
        record.identity_id = null;
    }

    if(req.user){
        record.user_id = req.user.id;
    }
    else{
        record.user_id = null;
    }

    if(req.err){
        record.error_message = req.err;
    }
    else{
        record.error_message = null;
    }


    record.save().then(function(log) {

        if(process.env.SERVER_LOG === 'true'){
            // get status color
            var color = log.status >= 500 ? 31 // red
            : log.status >= 400 ? 33 // yellow
            : log.status >= 300 ? 36 // cyan
            : log.status >= 200 ? 32 // green
            : 0; // no color

            console.log(((req.user)? req.user.email + " " : "") + "\x1b[35m" + log.ip + " \x1b[0m--> " + ((req.identity)? req.identity.user_agent + " " : "") + log.method + " " + log.route + " ==> " + log.response_time + " ms \x1b[" + color + "m" + log.status + "\x1b[0m");
        }

        if(process.env.DETAILED_LOG === 'true'){
            console.log("Request headers: ");
            console.log(req.headers);
            console.log();

            console.log("Request pramas: ");
            console.log(req.params);
            console.log();

            console.log("Request query variables: ");
            console.log(req.query);
            console.log();

            console.log("Request body: ");
            console.log(req.body);
            console.log();

            console.log('**************************************************');

            console.log("Response body: ");
            console.log(res.body);
            console.log();

            if(req.err){
                console.log("Server internal error: ");
                console.log(req.err);
                console.log();
            }
        }

        if(process.env.SERVER_LOG === 'true' || process.env.DETAILED_LOG === 'true'){
            console.log('==================================================');
        }
    });
};
