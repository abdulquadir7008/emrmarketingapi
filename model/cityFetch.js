const { DataTypes } = require('sequelize');
const sequelize = require('../include/dbconnect');

// Define the Membership model
const City = sequelize.define('City', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    city: DataTypes.STRING,
    state_id: DataTypes.INTEGER,
}, { tableName: 'cities', timestamps: false });

module.exports = City;
