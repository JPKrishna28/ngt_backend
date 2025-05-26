// No need for dotenv if we're providing the URI directly
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

async function createSuperAdmin() {
  try {
    // Connect to MongoDB with a hardcoded URI for your local database
    const mongoURI = 'mongodb://localhost:27017/employee-time-tracker';
    await mongoose.connect(mongoURI);
    console.log('MongoDB Connected to:', mongoURI);

    // Get the users collection
    const db = mongoose.connection.db;
    const usersCollection = db.collection('users');

    // Super admin details
    const employeeId = 'SUPER001';
    const plainPassword = 'superadmin123';
    
    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(plainPassword, salt);

    // Create super admin document
    const superAdmin = {
      employeeId,
      name: 'Super Administrator',
      password: hashedPassword,
      role: 'superadmin',
      createdAt: new Date()
    };

    // First check if this superadmin already exists
    const existingSuperAdmin = await usersCollection.findOne({ employeeId });
    
    if (existingSuperAdmin) {
      // Update the password
      await usersCollection.updateOne(
        { employeeId },
        { $set: { password: hashedPassword } }
      );
      console.log('Updated existing super admin password');
    } else {
      // Insert the new super admin
      await usersCollection.insertOne(superAdmin);
      console.log('Super admin created successfully');
    }
    
    console.log('Super admin login credentials:');
    console.log('Employee ID:', employeeId);
    console.log('Password:', plainPassword);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    try {
      // Close connection
      if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
        console.log('MongoDB Disconnected');
      }
    } catch (err) {
      console.error('Error disconnecting from MongoDB:', err);
    }
  }
}

createSuperAdmin();