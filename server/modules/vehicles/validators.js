const { body, param, validationResult } = require('express-validator');

// Enhanced middleware to check for validation errors with security
const validate = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    // Rate limiting: Block requests with too many validation errors
    if (errors.array().length > 8) {
      console.warn(`[SECURITY] Excessive vehicle validation errors from IP: ${req.ip || req.connection.remoteAddress}`, {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        errors: errors.array().length,
        endpoint: req.originalUrl,
        timestamp: new Date().toISOString()
      });
      
      return res.status(429).json({ 
        success: false,
        message: 'Too many validation errors. Please check your input carefully | أخطاء كثيرة في التحقق. يرجى مراجعة المدخلات',
        errors: [{ msg: 'Request blocked due to suspicious activity | تم حظر الطلب بسبب نشاط مشبوه' }]
      });
    }
    
    return res.status(400).json({ 
      success: false,
      errors: errors.array() 
    });
  }
  
  next();
};

// Enhanced vehicle name validation
const vehicleNameValidation = (fieldName, arabicName, required = true) => {
  const validation = body(fieldName)
    .trim()
    .escape() // Prevent XSS attacks
    .isLength({ min: required ? 2 : 0, max: 100 })
    .withMessage(`${fieldName} must be between 2 and 100 characters | ${arabicName} يجب أن يكون بين ٢ و ١٠٠ حرف`)
    .matches(/^[a-zA-Z0-9\u0600-\u06FF\s\-'.&()]+$/)
    .withMessage(`${fieldName} contains invalid characters | ${arabicName} يحتوي على أحرف غير صحيحة`);
  
  return required ? validation.notEmpty().withMessage(`${fieldName} is required | ${arabicName} مطلوب`) : validation.optional();
};

// Create vehicle validation
const createVehicleValidation = [
  vehicleNameValidation('name', 'اسم المركبة', true),
  
  body('nameAr')
    .optional()
    .trim()
    .escape() // Prevent XSS
    .isLength({ min: 2, max: 100 })
    .withMessage('Arabic name must be between 2 and 100 characters | الاسم العربي يجب أن يكون بين ٢ و ١٠٠ حرف')
    .matches(/^[\u0600-\u06FF\s\-'.&()0-9]+$/)
    .withMessage('Arabic name can only contain Arabic letters, numbers, spaces, and basic punctuation | الاسم العربي يمكن أن يحتوي على أحرف عربية وأرقام ومسافات وعلامات ترقيم أساسية'),
    
  body('type')
    .trim()
    .notEmpty()
    .withMessage('Vehicle type is required | نوع المركبة مطلوب')
    .isIn(['MOTORCYCLE', 'TRUCK'])
    .withMessage('Vehicle type must be either MOTORCYCLE or TRUCK | نوع المركبة يجب أن يكون دراجة نارية أو شاحنة'),
    
  body('maxUnits')
    .notEmpty()
    .withMessage('Max units capacity is required | السعة القصوى مطلوبة')
    .isInt({ min: 1, max: 1000 })
    .withMessage('Max units must be a positive integer between 1 and 1000 | السعة القصوى يجب أن تكون رقم صحيح بين ١ و ١٠٠٠')
    .custom((value, { req }) => {
      // Business rule validation based on vehicle type - FIXED
      const type = req.body.type; // ✅ Get actual value from request body
      if (type === 'MOTORCYCLE' && value > 70) {
        throw new Error('Motorcycle capacity cannot exceed 50 units | دراجة نارية لا يمكن أن تحمل أكثر من ٥٠ وحدة');
      }
      if (type === 'TRUCK' && value < 10) {
        throw new Error('Truck capacity must be at least 10 units | الشاحنة يجب أن تحمل ١٠ وحدات على الأقل');
      }
      return true;
    }),
    
  body('driverId')
    .optional()
    .isUUID(4)
    .withMessage('Driver ID must be a valid UUID | معرف السائق غير صحيح')
    .escape()
    .custom(async (driverId) => {
      if (!driverId) return true; // Skip if not provided
      
      // Verify driver exists and is available
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();
      
      try {
        const driver = await prisma.user.findUnique({
          where: { 
            id: driverId, 
            role: 'DRIVER', 
            status: 'ACTIVE' 
          }
        });
        
        if (!driver) {
          throw new Error('Driver not found or not active | السائق غير موجود أو غير نشط');
        }
        
        // Check if driver is already assigned to another vehicle
        const existingAssignment = await prisma.vehicle.findFirst({
          where: { 
            driverId: driverId, 
            isActive: true 
          }
        });
        
        if (existingAssignment) {
          throw new Error('Driver is already assigned to another vehicle | السائق مُعيَّن لمركبة أخرى');
        }
        
        return true;
      } catch (error) {
        if (error.message.includes('already assigned') || error.message.includes('not found')) {
          throw error;
        }
        // If it's a database error, let it pass
        return true;
      } finally {
        await prisma.$disconnect();
      }
    }),
    
  validate
];

// Update vehicle validation
const updateVehicleValidation = [
  vehicleNameValidation('name', 'اسم المركبة', false),
  
  body('nameAr')
    .optional()
    .trim()
    .escape() // Prevent XSS
    .isLength({ min: 2, max: 100 })
    .withMessage('Arabic name must be between 2 and 100 characters | الاسم العربي يجب أن يكون بين ٢ و ١٠٠ حرف')
    .matches(/^[\u0600-\u06FF\s\-'.&()0-9]+$/)
    .withMessage('Arabic name can only contain Arabic letters, numbers, spaces, and basic punctuation | الاسم العربي يمكن أن يحتوي على أحرف عربية وأرقام ومسافات وعلامات ترقيم أساسية'),
    
  body('type')
    .optional()
    .trim()
    .isIn(['MOTORCYCLE', 'TRUCK'])
    .withMessage('Vehicle type must be either MOTORCYCLE or TRUCK | نوع المركبة يجب أن يكون دراجة نارية أو شاحنة'),
    
  body('maxUnits')
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage('Max units must be a positive integer between 1 and 1000 | السعة القصوى يجب أن تكون رقم صحيح بين ١ و ١٠٠٠')
    .custom((value, { req }) => {
      // Business rule validation based on vehicle type - FIXED
      const type = req.body.type; // ✅ Get actual value from request body
      if (type === 'MOTORCYCLE' && value > 70) {
        throw new Error('Motorcycle capacity cannot exceed 50 units | دراجة نارية لا يمكن أن تحمل أكثر من ٥٠ وحدة');
      }
      if (type === 'TRUCK' && value < 10) {
        throw new Error('Truck capacity must be at least 10 units | الشاحنة يجب أن تحمل ١٠ وحدات على الأقل');
      }
      return true;
    }),
    
  validate
];

// Vehicle ID parameter validation
const vehicleIdValidation = [
  param('id')
    .isUUID(4)
    .withMessage('Invalid vehicle ID format | معرف المركبة غير صحيح')
    .escape(), // Prevent XSS in URL params
  
  validate
];

// Assign driver validation with enhanced security
const assignDriverValidation = [
  body('driverId')
    .trim()
    .notEmpty()
    .withMessage('Driver ID is required | معرف السائق مطلوب')
    .isUUID(4)
    .withMessage('Driver ID must be a valid UUID | معرف السائق غير صحيح')
    .escape()
    .custom(async (driverId, { req }) => {
      // Verify driver exists and is available
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();
      
      try {
        const driver = await prisma.user.findUnique({
          where: { 
            id: driverId, 
            role: 'DRIVER', 
            status: 'ACTIVE' 
          }
        });
        
        if (!driver) {
          console.warn(`[SECURITY] Attempted to assign non-existent driver: ${driverId} from IP: ${req.ip}`, {
            driverId: driverId,
            ip: req.ip,
            timestamp: new Date().toISOString()
          });
          
          throw new Error('Driver not found or not active | السائق غير موجود أو غير نشط');
        }
        
        // Check if driver is already assigned to another vehicle
        const existingAssignment = await prisma.vehicle.findFirst({
          where: { 
            driverId: driverId, 
            isActive: true 
          }
        });
        
        if (existingAssignment) {
          throw new Error('Driver is already assigned to another vehicle | السائق مُعيَّن لمركبة أخرى');
        }
        
        return true;
      } catch (error) {
        if (error.message.includes('already assigned') || error.message.includes('not found')) {
          throw error;
        }
        // If it's a database error, let it pass
        return true;
      } finally {
        await prisma.$disconnect();
      }
    }),
    
  validate
];

// Update status validation with enhanced security
const updateStatusValidation = [
  body('status')
    .trim()
    .notEmpty()
    .withMessage('Status is required | الحالة مطلوبة')
    .isIn(['AVAILABLE', 'ON_ROAD', 'OUT_OF_SERVICE'])
    .withMessage('Status must be AVAILABLE, ON_ROAD, or OUT_OF_SERVICE | الحالة يجب أن تكون متاحة أو في الطريق أو خارج الخدمة')
    .custom((status, { req }) => {
      // Business logic validation
      if (status === 'OUT_OF_SERVICE' && !req.body.reason) {
        throw new Error('Reason is required when setting vehicle out of service | السبب مطلوب عند وضع المركبة خارج الخدمة');
      }
      return true;
    }),
    
  body('reason')
    .if(body('status').equals('OUT_OF_SERVICE'))
    .notEmpty()
    .withMessage('Reason is required when setting vehicle out of service | السبب مطلوب عند وضع المركبة خارج الخدمة')
    .trim()
    .escape()
    .isLength({ min: 10, max: 200 })
    .withMessage('Reason must be between 10 and 200 characters | السبب يجب أن يكون بين ١٠ و ٢٠٠ حرف')
    .matches(/^[a-zA-Z0-9\u0600-\u06FF\s\.,\-!?]+$/)
    .withMessage('Reason contains invalid characters | السبب يحتوي على أحرف غير صحيحة'),
    
  validate
];

// Search validation for vehicle filtering
const vehicleSearchValidation = [
  body('page')
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage('Page must be between 1 and 1000 | الصفحة يجب أن تكون بين ١ و ١٠٠٠'),
  
  body('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100 | الحد الأقصى يجب أن يكون بين ١ و ١٠٠'),
  
  body('search')
    .optional()
    .trim()
    .escape() // Prevent XSS
    .isLength({ min: 2, max: 50 })
    .withMessage('Search term must be between 2 and 50 characters | مصطلح البحث يجب أن يكون بين ٢ و ٥٠ حرف')
    .matches(/^[a-zA-Z0-9\u0600-\u06FF\s\-]+$/)
    .withMessage('Search term contains invalid characters | مصطلح البحث يحتوي على أحرف غير صحيحة'),
  
  body('type')
    .optional()
    .isIn(['MOTORCYCLE', 'TRUCK'])
    .withMessage('Invalid vehicle type filter | فلتر نوع المركبة غير صحيح'),
  
  body('status')
    .optional()
    .isIn(['AVAILABLE', 'ON_ROAD', 'OUT_OF_SERVICE'])
    .withMessage('Invalid status filter | فلتر الحالة غير صحيح'),
  
  body('hasDriver')
    .optional()
    .isIn(['true', 'false'])
    .withMessage('hasDriver must be true or false | يجب أن يكون hasDriver صحيح أو خطأ'),
  
  validate
];

module.exports = {
  createVehicleValidation,
  updateVehicleValidation,
  assignDriverValidation,
  updateStatusValidation,
  vehicleIdValidation,
  vehicleSearchValidation,
  // Helper functions for reuse
  vehicleNameValidation
};