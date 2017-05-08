/**
 *  @mixin Identity
 *  @property {String} token The access token of the identity
 *  @property {Date} token_exp_date IThe expiry Date of the access token
 *  @property {Enum} user_agent The user agent of the identity
 *  @property {Date} last_logged_in Records the time of the most recent login using this identity
 *
 */

/**
* This function defines the model Identity
* @param  {Sequelize} sequelize this is the instance of Sequelize
* @ignore
*/
module.exports.defineIdentity = function(sequelize) {
    var Sequelize = require("sequelize");

    module.exports.Identity = sequelize.define('identity',{
        token: {
            type: Sequelize.STRING(700),
            unique: true,
            allowNull: false
        },
        token_exp_date: {
            type: Sequelize.DATE,
            allowNull: false
        },
        user_agent: {
            type: Sequelize.ENUM('Web', 'IOS', 'Android'),
            allowNull: false
        },
        last_logged_in: {
            type: Sequelize.DATE,
            allowNull: true,
            defaultValue: Sequelize.NOW
        }
    },
    {
        underscored: true,
        underscoredALL: true
    });
};
