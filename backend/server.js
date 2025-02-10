const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/db'); // Database connection
const compression = require('compression'); // Compress responses
const path = require('path');

// Load environment variables
dotenv.config();

// Connect to the database
connectDB();

// Initialize Express app
const app = express();

// Middleware
// app.use(cors()); // Enable CORS
app.use(cors({
  exposedHeaders: ['Content-Disposition']
}));
app.use(express.json({ limit: '10kb' })); // Limit request body size for security
app.use(compression()); // Compress response bodies for better performance

// Serve static files from the "uploads" directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Serve static frontend files (for production)
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'public')));
  app.get('*', (req, res) =>
    res.sendFile(path.join(__dirname, 'public', 'index.html'))
  );
}

// Global Error Handler (optional)
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Server error', error: err.message });
});

// Start the server
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});