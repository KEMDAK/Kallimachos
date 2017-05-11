var User     = require('../../app/models/User').User;
var Identity = require('../../app/models/Identity').Identity;
var Log      = require('../../app/models/Log').Log;
var Book     = require('../../app/models/Book').Book;
var Page     = require('../../app/models/Page').Page;

/* Identity_User relation */
User.hasMany(Identity, { as: 'Identities', foreignKey: { allowNull: false }, onDelete: 'CASCADE' });
Identity.belongsTo(User, { as: 'User', foreignKey: { allowNull: false }, onDelete: 'NO ACTION' });

/* Identity_Log relation */
Identity.hasMany(Log, { as: 'Logs', foreignKey: { allowNull: true }, onDelete: 'SET NULL' });
Log.belongsTo(Identity, { as: 'Identity', foreignKey: { allowNull: true }, onDelete: 'NO ACTION' });

/* Log_User relation */
User.hasMany(Log, { as: 'Logs', foreignKey: { allowNull: true }, onDelete: 'SET NULL' });
Log.belongsTo(User, { as: 'User', foreignKey: { allowNull: true }, onDelete: 'NO ACTION' });

/* Book_User relation */
User.hasMany(Book, { as: 'Books', foreignKey: { allowNull: true, unique: 'compositeIndex'}, onDelete: 'SET NULL' });
Book.belongsTo(User, { as: 'User', foreignKey: { allowNull: true, unique: 'compositeIndex' }, onDelete: 'NO ACTION' });

/* Book_Page relation */
Book.hasMany(Page, { as: 'Pages', foreignKey: { allowNull: true }, onDelete: 'SET NULL' });
Page.belongsTo(Book, { as: 'Book', foreignKey: { allowNull: true }, onDelete: 'NO ACTION' });
