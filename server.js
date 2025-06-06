const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const morgan = require('morgan');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Import routes
const authRoutes = require('./routes/auth');
const employeeRoutes = require('./routes/employees');
const timelogRoutes = require('./routes/timelogs');
const adminManagementRoutes = require('./routes/adminManagement');
// Add this line where you define your routes
const offerRoutes = require('./routes/offerRoutes');
const emailRoutes = require('./routes/emailRoutes');
const fileRoutes = require('./routes/fileRoutes');

// Add this line where you mount your routes

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));
app.use('/api/auth', authRoutes);
app.use('/api/offers', offerRoutes);
app.use('/api/email', emailRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/files', fileRoutes);
// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB Connected'))
  .catch(err => console.error('MongoDB Connection Error:', err));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/timelogs', timelogRoutes);
app.use('/api/admin-management', adminManagementRoutes);
// Root route
app.get('/', (req, res) => {
  res.send('Employee Time Tracker API is running');
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});