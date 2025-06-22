const { body, query, param, validationResult } = require('express-validator');

// Middleware to check for validation errors (following your Vehicle pattern)
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      success: false,
      message: 'Validation errors',
      errors: errors.array() 
    });
  }
  next();
};
// Validation for creating order
const createOrderValidation = [
  // Customer details
  body('customerName')
    .notEmpty()
    .withMessage('Customer name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Customer name must be between 2 and 100 characters'),
    
  body('customerNameAr')
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage('Arabic customer name must be between 2 and 100 characters'),
    
  body('customerPhone')
    .notEmpty()
    .withMessage('Customer phone is required')
    .matches(/^01[0-9]{9}$/)
    .withMessage('Phone must be valid Egyptian mobile number (01XXXXXXXXX)'),
    
  body('customerAlternativePhone')
    .optional()
    .matches(/^(01[0-9]{9}|02[0-9]{8})$/)
    .withMessage('Alternative phone must be valid Egyptian number'),
    
  body('customerEmail')
    .optional()
    .isEmail()
    .withMessage('Must be a valid email address'),

  // Delivery address
  body('deliveryAddress')
    .notEmpty()
    .withMessage('Delivery address is required')
    .isLength({ min: 10, max: 200 })
    .withMessage('Delivery address must be between 10 and 200 characters'),
    
  body('deliveryArea')
    .notEmpty()
    .withMessage('Delivery area is required')
    .isLength({ min: 2, max: 50 })
    .withMessage('Delivery area must be between 2 and 50 characters'),
    
  body('deliveryGovernorate')
    .notEmpty()
    .withMessage('Delivery governorate is required')
    .isLength({ min: 2, max: 50 })
    .withMessage('Delivery governorate must be between 2 and 50 characters'),

  // Package details
  body('packageType')
    .notEmpty()
    .withMessage('Package type is required')
    .isIn(['ELECTRONICS', 'CLOTHES', 'FOOD', 'BOOKS', 'COSMETICS', 'ACCESSORIES', 'OTHER'])
    .withMessage('Invalid package type'),
    
  body('allowOpening')
    .notEmpty()
    .withMessage('Allow opening preference is required')
    .isBoolean()
    .withMessage('Allow opening must be true or false'),
    
  body('packageDescription')
    .optional()
    .isLength({ max: 200 })
    .withMessage('Package description must not exceed 200 characters'),
    
  body('productPrice')
    .notEmpty()
    .withMessage('Product price is required')
    .isFloat({ min: 0 })
    .withMessage('Product price must be a positive number'),

  // Shipping details
  body('shippingFee')
    .notEmpty()
    .withMessage('Shipping fee is required')
    .isFloat({ min: 0, max: 1000 })
    .withMessage('Shipping fee must be between 0 and 1000 EGP'),
    
  body('paymentMethod')
    .optional()
    .isIn(['COD', 'PREPAID'])
    .withMessage('Payment method must be COD or PREPAID'),

  // Priority
  body('priority')
    .optional()
    .isIn(['LOW', 'NORMAL', 'HIGH', 'URGENT'])
    .withMessage('Priority must be LOW, NORMAL, HIGH, or URGENT'),

  // Pickup details (optional)
  body('pickupTime')
    .optional()
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Pickup time must be in HH:MM format'),
    
  body('expectedDeliveryDate')
    .optional()
    .isISO8601()
    .withMessage('Expected delivery date must be a valid date'),
    
  body('deliveryTimeWindow')
    .optional()
    .isLength({ max: 50 })
    .withMessage('Delivery time window must not exceed 50 characters'),

  validate
];

// Validation for updating order
const updateOrderValidation = [
  // Make all fields optional for updates
  body('customerName')
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage('Customer name must be between 2 and 100 characters'),
    
  body('customerPhone')
    .optional()
    .matches(/^01[0-9]{9}$/)
    .withMessage('Phone must be valid Egyptian mobile number (01XXXXXXXXX)'),
    
  body('productPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Product price must be a positive number'),
    
  body('shippingFee')
    .optional()
    .isFloat({ min: 0, max: 200 })
    .withMessage('Shipping fee must be between 0 and 200 EGP'),
    
  body('packageType')
    .optional()
    .isIn(['ELECTRONICS', 'CLOTHES', 'FOOD', 'BOOKS', 'COSMETICS', 'ACCESSORIES', 'OTHER'])
    .withMessage('Invalid package type'),
    
  body('allowOpening')
    .optional()
    .isBoolean()
    .withMessage('Allow opening must be true or false'),
    
  body('paymentMethod')
    .optional()
    .isIn(['COD', 'PREPAID'])
    .withMessage('Payment method must be COD or PREPAID'),
    
  body('priority')
    .optional()
    .isIn(['LOW', 'NORMAL', 'HIGH', 'URGENT'])
    .withMessage('Priority must be LOW, NORMAL, HIGH, or URGENT'),

  validate
];

// Validation for order status update
const updateOrderStatusValidation = [
  body('status')
    .notEmpty()
    .withMessage('Status is required')
    .isIn(['PENDING', 'ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED', 'RETURNED'])
    .withMessage('Invalid order status'),

  validate
];

// Validation for vehicle assignment
const assignVehicleValidation = [
  body('vehicleId')
    .notEmpty()
    .withMessage('Vehicle ID is required')
    .isUUID()
    .withMessage('Vehicle ID must be a valid UUID'),

  validate
];

// Validation for query parameters
const queryValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
    
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
    
  query('search')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('Search query must be between 1 and 100 characters'),
    
  query('status')
    .optional()
    .isIn(['PENDING', 'ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED', 'RETURNED'])
    .withMessage('Invalid status filter'),
    
  query('paymentMethod')
    .optional()
    .isIn(['COD', 'PREPAID'])
    .withMessage('Invalid payment method filter'),
    
  query('sortBy')
    .optional()
    .isIn(['createdAt', 'orderNumber', 'customerName', 'status', 'productPrice', 'shippingFee'])
    .withMessage('Invalid sort field'),
    
  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sort order must be asc or desc'),

  validate
];

// Validation for UUID parameters
const uuidParamValidation = [
  param('id')
    .isUUID()
    .withMessage('Invalid order ID format'),

  validate
];

// Add these enhanced validators before the module.exports section

const { VALID_GOVERNORATES, VALID_GOVERNORATES_AR, ARABIC_PATTERNS, BUSINESS_RULES } = require('../../config/constants');

// Enhanced geographic validation with Arabic support
const geographicValidation = [
  body('deliveryGovernorate')
    .notEmpty()
    .withMessage('Delivery governorate is required')
    .custom((value) => {
      if (!VALID_GOVERNORATES.includes(value) && !VALID_GOVERNORATES_AR.includes(value)) {
        throw new Error('Invalid Egyptian governorate');
      }
      return true;
    }),
    
  body('deliveryGovernorateAr')
    .optional()
    .custom((value) => {
      if (value && !VALID_GOVERNORATES_AR.includes(value)) {
        throw new Error('Invalid Arabic governorate name');
      }
      return true;
    }),
    
  body('deliveryAreaAr')
    .optional()
    .matches(ARABIC_PATTERNS.ARABIC_NAME)
    .withMessage('Arabic area name must contain only Arabic characters'),
    
  body('customerNameAr')
    .optional()
    .matches(ARABIC_PATTERNS.ARABIC_NAME)
    .withMessage('Arabic customer name must contain only Arabic characters'),

  validate
];

// Enhanced bulk driver assignment validation
const bulkDriverAssignmentValidation = [
  body('orderIds')
    .isArray({ min: 1, max: BUSINESS_RULES.MAX_BULK_ASSIGNMENT })
    .withMessage(`Must provide 1-${BUSINESS_RULES.MAX_BULK_ASSIGNMENT} order IDs`),
    
  body('orderIds.*')
    .isUUID()
    .withMessage('Each order ID must be valid UUID'),
    
  body('driverId')
    .notEmpty()
    .withMessage('Driver ID is required')
    .withMessage('معرف السائق مطلوب')
    .isUUID()
    .withMessage('Driver ID must be valid UUID'),
    
  body('vehicleId')
    .optional()
    .isUUID()
    .withMessage('Vehicle ID must be valid UUID'),

  body('commissionRate')
    .optional()
    .isFloat({ min: 5, max: 100 })
    .withMessage('Driver commission must be between 5 and 100 EGP per order')
    .withMessage('عمولة السائق يجب أن تكون بين 5 و 100 جنيه لكل طلب'),
    
  body('notes')
    .optional()
    .isLength({ max: 200 })
    .withMessage('Notes must not exceed 200 characters'),

  validate
];

// Enhanced bulk outsource assignment validation
const bulkOutsourceAssignmentValidation = [
  body('orderIds')
    .isArray({ min: 1, max: BUSINESS_RULES.MAX_BULK_ASSIGNMENT })
    .withMessage(`Must provide 1-${BUSINESS_RULES.MAX_BULK_ASSIGNMENT} order IDs`),
    
  body('orderIds.*')
    .isUUID()
    .withMessage('Each order ID must be valid UUID'),
    
  body('outsourceId')
    .notEmpty()
    .withMessage('Outsource ID is required')
    .withMessage('معرف الشريك الخارجي مطلوب')
    .isUUID()
    .withMessage('Outsource ID must be valid UUID'),
    
  body('commissionRate')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('Commission rate must be between 0 and 100 EGP Per Order')
    .withMessage('معدل العمولة يجب أن يكون بين 0 و 100'),

  validate
];

// Enhanced status transition validation with Arabic support
const enhancedStatusUpdateValidation = [
  body('status')
    .notEmpty()
    .withMessage('Status is required')
    .withMessage('الحالة مطلوبة')
    .isIn(['PENDING', 'ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED', 'PARTIALLY_DELIVERED', 'CANCELLED', 'RETURNED'])
    .withMessage('Invalid order status')
    .withMessage('حالة الطلب غير صحيحة'),
    
  body('notes')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Status update notes must not exceed 500 characters'),

  validate
];
const trackOrderValidation = [
  param('trackingNumber')
    .matches(/^RNX-\d{4}-\d{6}$/)
    .withMessage('Invalid tracking number format. Expected format: RNX-YYYY-XXXXXX')
    .withMessage('رقم التتبع غير صحيح. الصيغة المطلوبة: RNX-YYYY-XXXXXX'),
  validate
];

module.exports = {
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
};