const express = require('express');
const router = express.Router();
const routeController = require('./controller');
const { protect, restrictTo } = require('../../middleware/auth');
const {
  optimizeRouteValidation,
  updateRouteStatusValidation
} = require('./validators');

// Driver routes (drivers can only access their own routes)
router.get('/driver/:driverId/orders', 
  protect, 
  routeController.getDriverOrders
);

router.post('/driver/:driverId/optimize', 
  protect, 
  optimizeRouteValidation,
  routeController.optimizeDriverRoute
);

router.get('/driver/:driverId/current', 
  protect, 
  routeController.getCurrentRoute
);

router.put('/driver/:driverId/update-status', 
  protect, 
  updateRouteStatusValidation,
  routeController.updateOrderStatus
);

// Admin routes
router.get('/admin/all-routes', 
  protect, 
  restrictTo('ADMIN'), 
  routeController.getAllDriverRoutes
);

router.get('/admin/geocache/stats', 
  protect, 
  restrictTo('ADMIN'), 
  routeController.getGeocacheStats
);

router.delete('/admin/geocache/clear', 
  protect, 
  restrictTo('ADMIN'), 
  routeController.clearGeocache
);

module.exports = router;