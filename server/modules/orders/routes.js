const express = require('express');
const { body } = require('express-validator');
const OrderController = require('./controller');
const { protect, restrictTo } = require('../../middleware/auth');
const { bulkAssignmentLimiter, orderCreationLimiter } = require('../../middleware/rateLimiter');
const {
  validate,
  createOrderValidation,
  updateOrderValidation,
  updateOrderStatusValidation,
  trackOrderValidation,
  assignVehicleValidation,
  queryValidation,
  uuidParamValidation,
  // Enhanced validators with Arabic support
  geographicValidation,
  bulkDriverAssignmentValidation,
  bulkOutsourceAssignmentValidation,
  enhancedStatusUpdateValidation
} = require('./validators');

const router = express.Router();


router.get('/track/:trackingNumber', trackOrderValidation, OrderController.trackOrder);
// Apply authentication to all routes
router.use(protect);

// ========================================
// GENERAL ORDER ROUTES (No Parameters)
// ========================================
router.get('/track/:trackingNumber', OrderController.trackOrder);
// Public order routes (all authenticated users)
router.get(
  '/statistics',
  restrictTo('ADMIN'),
  OrderController.getOrderStatistics
);

router.get(
  '/available-vehicles',
  restrictTo('ADMIN'),
  OrderController.getAvailableVehicles
);

// Order CRUD routes
router
  .route('/')
  .get(
    queryValidation,
    OrderController.getAllOrders
  )
  .post(
    orderCreationLimiter,
    restrictTo('ADMIN', 'MERCHANT'),
    createOrderValidation,
    OrderController.createOrder
  );

// ========================================
// USER-SPECIFIC ROUTES (No Parameters)
// ========================================

// Merchant-specific routes
router.get(
  '/my-orders',
  restrictTo('MERCHANT'),
  queryValidation,
  OrderController.getMyOrders
);

// Driver-specific routes
router.get(
  '/my-deliveries',
  restrictTo('DRIVER'),
  queryValidation,
  OrderController.getMyDeliveries
);

// ========================================
// ADVANCED FILTERING & STATISTICS
// ========================================

// Advanced filtering
router.get('/filter-advanced',
  restrictTo('ADMIN'),
  OrderController.getOrdersAdvancedFilter
);

// Geographic statistics
router.get('/geographic-statistics',
  restrictTo('ADMIN'),
  OrderController.getGeographicStatistics
);

// ========================================
// ASSIGNMENT RESOURCES
// ========================================

// Get available assignment targets
router.get('/available-drivers',
  restrictTo('ADMIN'),
  OrderController.getAvailableDrivers
);

router.get('/available-outsource',
  restrictTo('ADMIN'),
  OrderController.getAvailableOutsource
);

// ========================================
// BULK ASSIGNMENT OPERATIONS (Enhanced with Arabic Support)
// ========================================

// Bulk driver assignment
router.post('/assign-bulk-driver',
  bulkAssignmentLimiter,
  restrictTo('ADMIN'),
  bulkDriverAssignmentValidation,
  OrderController.assignBulkDriver
);

// Bulk outsource assignment
router.post('/assign-bulk-outsource',
  bulkAssignmentLimiter,
  restrictTo('ADMIN'),
  bulkOutsourceAssignmentValidation,
  OrderController.assignBulkOutsource
);

// Bulk unassignment
router.post('/unassign-bulk',
  bulkAssignmentLimiter,
  restrictTo('ADMIN'),
  [
    body('orderIds')
      .isArray({ min: 1 })
      .withMessage('At least one order ID is required')
  ],
  validate,
  OrderController.unassignBulkOrders
);

// ========================================
// INDIVIDUAL ORDER ROUTES (With :id Parameter)
// THESE MUST BE LAST TO AVOID CONFLICTS
// ========================================

// Order management routes (by ID)
router
  .route('/:id')
  .get(
    uuidParamValidation,
    OrderController.getOrderById
  )
  .put(
    restrictTo('ADMIN', 'MERCHANT'),
    uuidParamValidation,
    updateOrderValidation,
    OrderController.updateOrder
  )
  .delete(
    restrictTo('ADMIN', 'MERCHANT'),
    uuidParamValidation,
    OrderController.deleteOrder
  );

// Vehicle assignment routes (Admin only)
router.put(
  '/:id/assign-vehicle',
  restrictTo('ADMIN'),
  uuidParamValidation,
  assignVehicleValidation,
  OrderController.assignVehicle
);

router.put(
  '/:id/unassign-vehicle',
  restrictTo('ADMIN'),
  uuidParamValidation,
  OrderController.unassignVehicle
);

// Status update routes (Admin and Driver) - Enhanced with Arabic support
router.put(
  '/:id/status',
  restrictTo('ADMIN', 'DRIVER'),
  uuidParamValidation,
  enhancedStatusUpdateValidation,
  OrderController.updateOrderStatus
);

router.put('/:id/assign', protect, restrictTo('ADMIN', 'MANAGER'), OrderController.assignDriver);
router.put('/:id/unassign', protect, restrictTo('ADMIN', 'MANAGER'), OrderController.unassignOrder);
router.put('/:id/status-and-assign', protect, restrictTo('ADMIN', 'MANAGER'), OrderController.updateStatusAndAssign);

module.exports = router;
