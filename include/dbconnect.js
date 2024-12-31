require('dotenv').config();
const { Sequelize } = require('sequelize');
const sequelize = new Sequelize(
    `mysql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}/${process.env.DB_NAME}`,
    {
      dialect: 'mysql',
      dialectModule: require('mysql2'), 
      logging: false,
    }
  );
  sequelize.authenticate()
  .then(() => {
    console.log('Connection established successfully.');
  })
  .catch((err) => {
    console.error('Unable to connect to the database:', err);
  });

module.exports = sequelize;