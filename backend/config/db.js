const mongoose = require('mongoose');

const connectDB = async () => {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/pepsi_db';

  try {
    const conn = await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 30000,
    });
    const isLocal = conn.connection.host.includes('127.0.0.1') || conn.connection.host.includes('localhost');
    const label = isLocal ? 'Local MongoDB' : 'Cloud MongoDB Atlas';
    console.log(`✅ ${label} Connected: ${conn.connection.host}/${conn.connection.name}`);
  } catch (error) {
    console.error(`❌ MongoDB Connection Error (${error.message}). Attempting fallback...`);
    try {
      const { MongoMemoryServer } = require('mongodb-memory-server');
      const mongoServer = await MongoMemoryServer.create();
      const memoryUri = mongoServer.getUri();
      const conn = await mongoose.connect(memoryUri);
      console.log(`MongoMemoryServer Fallback Connected: ${conn.connection.host}`);
    } catch (fallbackErr) {
      console.error(`MongoDB Connection Error: ${fallbackErr.message}`);
      process.exit(1);
    }
  }
};

module.exports = connectDB;
