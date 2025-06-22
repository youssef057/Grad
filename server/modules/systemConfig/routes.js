const express = require('express');
const { body, param } = require('express-validator');
const SystemConfigController = require('./controller');
const { protect, restrictTo } = require('../../middleware/auth');
const { BUSINESS_RULES } = require('../../config/constants');

// Arabic-aware validation middleware
const validate = (req, res, next) => {
  const { validationResult } = require('express-validator');
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation errors',
      messageAr: 'أخطاء في التحقق من صحة البيانات',
      errors: errors.array()
    });
  }
  
  next();
};

const router = express.Router();

// Apply authentication to all routes
router.use(protect);

// All routes are admin-only
router.use(restrictTo('ADMIN'));

// Get max orders per driver
router.get('/max-orders-per-driver', SystemConfigController.getMaxOrdersPerDriver);

// Update max orders per driver
router.put('/max-orders-per-driver', 
  [
    body('maxOrders')
      .notEmpty()
      .withMessage('Max orders value is required')
      .isInt({ min: BUSINESS_RULES.MIN_ORDERS_PER_DRIVER, max: BUSINESS_RULES.MAX_ORDERS_PER_DRIVER })
      .withMessage(`Max orders must be between ${BUSINESS_RULES.MIN_ORDERS_PER_DRIVER} and ${BUSINESS_RULES.MAX_ORDERS_PER_DRIVER}`)
      .toInt()
  ],
  validate,
  SystemConfigController.updateMaxOrdersPerDriver
);

// Get all configurations
router.get('/', SystemConfigController.getAllConfigs);

// Get specific configuration value
router.get('/:key',
  [
    param('key')
      .notEmpty()
      .withMessage('Configuration key is required')
      .isLength({ min: 1, max: 100 })
      .withMessage('Configuration key must be between 1 and 100 characters')
      .matches(/^[A-Z_]+$/)
      .withMessage('Configuration key must contain only uppercase letters and underscores')
  ],
  validate,
  SystemConfigController.getConfigValue
);

module.exports = router;