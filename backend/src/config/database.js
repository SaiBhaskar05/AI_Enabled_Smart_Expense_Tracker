const mongoose = require('mongoose');

const connectDB = async (retries = 5, delay = 5000) => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/expense-tracker', {
      serverSelectionTimeoutMS: 8000,
    });
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ MongoDB connection error: ${error.message}`);
    if (retries > 0) {
      console.log(`🔄 Retrying database connection in ${delay / 1000}s... (${retries} attempts left)`);
      setTimeout(() => connectDB(retries - 1, delay), delay);
    } else {
      console.error(`⚠️ MongoDB Atlas: Make sure 0.0.0.0/0 is added to Network Access IP Whitelist.`);
    }
  }
};

module.exports = connectDB;
