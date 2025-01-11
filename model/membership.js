const { DataTypes } = require('sequelize');
const sequelize = require('../include/dbconnect'); // Import the shared connection

// Define the Membership model
const Membership = sequelize.define('Membership', {
    member_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true, // If it's auto-incrementing
    },
    fname: DataTypes.STRING,
    lname: DataTypes.INTEGER,
    phone: DataTypes.STRING,
    password: DataTypes.STRING,
    email: { type: DataTypes.STRING, unique: true },
    country:DataTypes.STRING,
    stree_address:DataTypes.STRING,
    city:DataTypes.STRING,
    state:DataTypes.STRING,
    gender:DataTypes.STRING,
    postalcode:DataTypes.STRING,
    landmark:DataTypes.STRING,
    status:DataTypes.STRING,
    userid: DataTypes.STRING,
    sess:DataTypes.STRING,
}, { tableName: 'membership', timestamps: false });

module.exports = Membership;
