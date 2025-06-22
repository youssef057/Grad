const { body, param, validationResult } = require('express-validator');

/**
 * Validation for driver route optimization request
 */
const optimizeRouteValidation = [
  param('driverId')
    .isUUID()
    .withMessage('Driver ID must be a valid UUID | معرف السائق غير صحيح'),
  
  body('forceRecalculate')
    .optional()
    .isBoolean()
    .withMessage('Force recalculate must be boolean | إعادة الحساب يجب أن تكون true أو false'),
  
  body('includeTraffic')
    .optional()
    .isBoolean()
    .withMessage('Include traffic must be boolean | حالة المرور يجب أن تكون true أو false'),
  
  // Validation middleware
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array().map(error => ({
          type: error.type,
          value: error.value,
          msg: error.msg,
          path: error.path,
          location: error.location
        }))
      });
    }
    next();
  }
];

/**
 * Validation for route status update
 */
const updateRouteStatusValidation = [
  param('driverId')
    .isUUID()
    .withMessage('Driver ID must be a valid UUID | معرف السائق غير صحيح'),
  
  body('orderId')
    .isUUID()
    .withMessage('Order ID must be a valid UUID | معرف الطلب غير صحيح'),
  
  body('status')
    .isIn(['DELIVERED', 'FAILED', 'SKIPPED'])
    .withMessage('Status must be DELIVERED, FAILED, or SKIPPED | الحالة يجب أن تكون مُسلم، فاشل، أو مُتخطى'),
  
  body('deliveryNotes')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Delivery notes too long | ملاحظات التسليم طويلة جداً'),
  
  // Validation middleware
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array().map(error => ({
          type: error.type,
          value: error.value,
          msg: error.msg,
          path: error.path,
          location: error.location
        }))
      });
    }
    next();
  }
];

module.exports = {
  optimizeRouteValidation,
  updateRouteStatusValidation
};