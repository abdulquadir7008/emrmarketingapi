const { Sequelize } = require('sequelize');
const dbHOST = process.env.DBHOST;
const sequelize = new Sequelize('emr_marketing', 'root', '', {
    host: dbHOST,
    dialect: 'mysql',
});

module.exports = sequelize;