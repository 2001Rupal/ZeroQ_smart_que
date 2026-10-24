const mongoose = require('mongoose');
const config = require('./environment');

let isConnected = false;

async function connectDatabase(uri = config.mongoUri) {
  if (isConnected) {
    return mongoose.connection;
  }

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
      maxPoolSize: 10,
      minPoolSize: 2,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
      autoIndex: true
    });
    isConnected = true;
    console.log(`[Database] MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);
    return conn.connection;
  } catch (error) {
    console.error(`[Database] MongoDB connection error:`, error.message);
    throw error;
  }
}

async function disconnectDatabase() {
  if (isConnected) {
    await mongoose.disconnect();
    isConnected = false;
    console.log('[Database] MongoDB disconnected');
  }
}

module.exports = {
  connectDatabase,
  disconnectDatabase
};
