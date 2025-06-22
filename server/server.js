const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { authMiddleware } = require('./middleware/auth');
const errorMiddleware = require('./middleware/error');


// Import routes from modules
const userRoutes = require('./modules/users/routes');
//const orderRoutes = require('./modules/orders/routes');
const vehicleRoutes = require('./modules/vehicles/routes');
const orderRoutes = require('./modules/orders/routes');
const financialRoutes = require('./modules/financial/routes'); // ADD THIS LINE
const systemConfigRoutes = require('./modules/systemConfig/routes');
const routeRoutes = require('./modules/routes/routes');
//const routeRoutes = require('./modules/routes/routes');
//const notificationRoutes = require('./modules/notifications/routes');

// Create Express app
const app = express();

// Middleware
app.use(helmet()); // Security headers
app.use(morgan('dev')); // Logging
app.use(cors()); // Enable CORS
app.use(express.json()); // Parse JSON request body

// Routes
app.use('/api/users', userRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/financial', financialRoutes); // ADD THIS LINE
app.use('/api/system-config', systemConfigRoutes);
app.use('/api/routes', routeRoutes);
//app.use('/api/routes', routeRoutes);
//app.use('/api/notifications', notificationRoutes);

// Base route
app.get('/', (req, res) => {
  res.json({ message: 'Logistics Management System API' });
});

// Error handling middleware
app.use(errorMiddleware);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

module.exports = app;

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});