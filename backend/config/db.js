const mongoose = require('mongoose');

const connectDB = async () => {
    console.log("Connection String",process.env.MONGO_URI);
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: (10 * 1000), // Timeout after 5 seconds
    })
    .then(() => console.log("Database connected"))
    .catch(err => console.log("Database connection failed:", err));
};
module.exports = connectDB;