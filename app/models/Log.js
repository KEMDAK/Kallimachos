/**
 *  @mixin Log
 *  @property {String} method The method name
 *  @property {String} route The route accessed by the identity
 *  @property {Integer} response_time The response time of the request in milliseconds
 *  @property {Integer} status The response HTTP status code
 *  @property {String} ip The ip address of the device requesting the route
 *  @property {String} error_message The error message that is produced by the server
 */

/**
* This Function define the model of the log Object
* @param  {sequelize} connection the instance of the sequelize Object
* @ignore
*/
module.exports.defineLog = function(connection) {
    var Sequelize = require("sequelize");

    module.exports.Log = connection.define('log',{
        method: {
            type: Sequelize.STRING(45),
            allowNull: false
        },
        route: {
            type: Sequelize.STRING,
            allowNull: false
        },
        response_time: {
            type: Sequelize.INTEGER,
            allowNull: false
        },
        status: {
            type: Sequelize.INTEGER,
            allowNull: false
        },
        ip: {
            type: Sequelize.STRING(50),
            allowNull: false
        },
        error_message: {
            type: Sequelize.TEXT,
            allowNull: true
        }
    },
    {
        underscored: true,
        underscoredALL: true
    });
};
