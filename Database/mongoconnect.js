require('dotenv').config()
const mongoose = require('mongoose');
const mongoURI = process.env.MONGODB_URI;

const connectDB = async (uri) => {
  try {
    await mongoose.connect(uri);
    console.log('MongoDB connected');
  } catch (err) {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  }
};

module.exports = connectDB;