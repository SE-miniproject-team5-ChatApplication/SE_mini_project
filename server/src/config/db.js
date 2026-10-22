// MongoDB connection (component C12 - Data Access). Mongoose builds every
// query from typed schemas, which keeps queries parameterised (NFR-SEC-5).
const mongoose = require('mongoose');
const config = require('./index');
const logger = require('../utils/logger');

mongoose.set('strictQuery', true);

async function connectDb(url = config.mongoUrl) {
  await mongoose.connect(url);
  logger.info('Connected to MongoDB');
  return mongoose.connection;
}

async function disconnectDb() {
  await mongoose.disconnect();
}

function dbState() {
  return mongoose.connection.readyState === 1 ? 'up' : 'down';
}

module.exports = { connectDb, disconnectDb, dbState };
