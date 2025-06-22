const express = require('express');
const router = express.Router();
const vehicleController = require('./controller');
const { protect, restrictTo } = require('../../middleware/auth'); // ✅ Matches your auth.js exports
const { 
  createVehicleValidation,
  updateVehicleValidation,
  assignDriverValidation,
  updateStatusValidation,
  vehicleIdValidation
} = require('./validators');

// Admin routes (all vehicle operations require admin access)
router.get('/statistics', protect, restrictTo('ADMIN'), vehicleController.getVehicleStatistics);
router.get('/available', protect, restrictTo('ADMIN'), vehicleController.getAvailableVehicles);
router.get('/available-drivers', protect, restrictTo('ADMIN'), vehicleController.getAvailableDrivers);

router.get('/', protect, restrictTo('ADMIN'), vehicleController.getAllVehicles);
router.post('/', protect, restrictTo('ADMIN'), createVehicleValidation, vehicleController.createVehicle);

router.get('/:id', protect, restrictTo('ADMIN'), vehicleIdValidation, vehicleController.getVehicleById);
router.put('/:id', protect, restrictTo('ADMIN'), vehicleIdValidation, updateVehicleValidation, vehicleController.updateVehicle);
router.delete('/:id', protect, restrictTo('ADMIN'), vehicleIdValidation, vehicleController.deleteVehicle);

// Vehicle assignment routes
router.put('/:id/assign-driver', protect, restrictTo('ADMIN'), vehicleIdValidation, assignDriverValidation, vehicleController.assignDriver);
router.put('/:id/unassign-driver', protect, restrictTo('ADMIN'), vehicleIdValidation, vehicleController.unassignDriver);
router.put('/:id/status', protect, restrictTo('ADMIN'), vehicleIdValidation, updateStatusValidation, vehicleController.updateVehicleStatus);

module.exports = router;