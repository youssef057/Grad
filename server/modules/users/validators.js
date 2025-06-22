const { body, param, validationResult } = require('express-validator');

// Middleware to check for validation errors with enhanced security
const validate = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    // Rate limiting: Block requests with too many validation errors
    if (errors.array().length > 10) {
      console.warn(`[SECURITY] Excessive validation errors from IP: ${req.ip || req.connection.remoteAddress}`, {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        errors: errors.array().length,
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

// Common disposable email domains to block
const disposableEmailDomains = [
  'tempmail.org', '10minutemail.com', 'guerrillamail.com',
  'mailinator.com', 'yopmail.com', 'trash-mail.com',
  'throwaway.email', 'temp-mail.org', 'getnada.com',
  'maildrop.cc', 'sharklasers.com', 'grr.la',
  'temp-mail.com', 'dispostable.com', 'mohmal.com'
];

// Common email domain typos
const emailDomainTypos = {
  'gmial.com': 'gmail.com',
  'gmai.com': 'gmail.com',
  'gmil.com': 'gmail.com',
  'yahooo.com': 'yahoo.com',
  'yaho.com': 'yahoo.com',
  'hotmial.com': 'hotmail.com',
  'hotmial.co': 'hotmail.com',
  'outlok.com': 'outlook.com'
};

// Enhanced email validation function with duplicate check
const enhancedEmailValidation = (skipDuplicateCheck = false) => [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required | البريد الإلكتروني مطلوب')
    .isEmail()
    .withMessage('Please provide a valid email address | يرجى إدخال بريد إلكتروني صحيح')
    .isLength({ min: 5, max: 254 })
    .withMessage('Email must be between 5 and 254 characters | البريد الإلكتروني يجب أن يكون بين ٥ و ٢٥٤ حرف')
    .normalizeEmail({
      gmail_lowercase: true,
      gmail_remove_dots: false,
      gmail_remove_subaddress: false,
      outlookdotcom_lowercase: true,
      yahoo_lowercase: true,
      icloud_lowercase: true
    })
    .custom(async (email, { req }) => {
      const domain = email.split('@')[1]?.toLowerCase();
      
      if (!domain) {
        throw new Error('Invalid email format | صيغة البريد الإلكتروني غير صحيحة');
      }
      
      // Block disposable email domains with security logging
      if (disposableEmailDomains.includes(domain)) {
        console.warn(`[SECURITY] Blocked disposable email attempt: ${email} from IP: ${req.ip}`, {
          email: email,
          domain: domain,
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          timestamp: new Date().toISOString()
        });
        
        throw new Error('Disposable email addresses are not allowed. Please use a permanent email address | البريد الإلكتروني المؤقت غير مسموح. يرجى استخدام بريد إلكتروني دائم');
      }
      
      // Check for common typos and suggest corrections
      if (emailDomainTypos[domain]) {
        throw new Error(`Did you mean ${email.replace(domain, emailDomainTypos[domain])}? | هل تقصد ${email.replace(domain, emailDomainTypos[domain])}؟`);
      }
      
      // Block obviously fake domains with security logging
      const suspiciousDomains = ['test.com', 'example.com', 'fake.com', 'spam.com'];
      if (suspiciousDomains.includes(domain)) {
        console.warn(`[SECURITY] Blocked suspicious email domain: ${email} from IP: ${req.ip}`, {
          email: email,
          domain: domain,
          ip: req.ip,
          timestamp: new Date().toISOString()
        });
        
        throw new Error('Please provide a real email address | يرجى إدخال بريد إلكتروني حقيقي');
      }
      
      // Check for duplicate email (if not skipped)
      if (!skipDuplicateCheck) {
        const { PrismaClient } = require('@prisma/client');
        const prisma = new PrismaClient();
        
        try {
          const existingUser = await prisma.user.findUnique({
            where: { email: email }
          });
          
          if (existingUser) {
            throw new Error('Email address already registered. Please use a different email or try logging in | البريد الإلكتروني مسجل مسبقاً. يرجى استخدام بريد آخر أو تسجيل الدخول');
          }
          
          return true;
        } catch (error) {
          if (error.message.includes('already registered')) {
            throw error;
          }
          // If it's a database error, let it pass (don't block registration)
          return true;
        } finally {
          await prisma.$disconnect();
        }
      }
      
      return true;
    })
];

// Enhanced name validation
const nameValidation = (fieldName, arabicName, required = true) => {
  const validation = body(fieldName)
    .trim()
    .escape() // Prevent XSS attacks
    .isLength({ min: required ? 1 : 0, max: 50 })
    .withMessage(`${fieldName} must be between 1 and 50 characters | ${arabicName} يجب أن يكون بين ١ و ٥٠ حرف`)
    .matches(/^[a-zA-Z\u0600-\u06FF\s'-]+$/)
    .withMessage(`${fieldName} can only contain letters, spaces, hyphens and apostrophes | ${arabicName} يمكن أن يحتوي على أحرف ومسافات وشرطات فقط`);
  
  return required ? validation.notEmpty().withMessage(`${fieldName} is required | ${arabicName} مطلوب`) : validation.optional();
};

// Enhanced phone validation
const phoneValidation = (required = true) => {
  const validation = body('phone')
    .trim()
    .customSanitizer((value) => {
      // Normalize: remove spaces, dashes, plus signs, and country code
      return value.replace(/[\s\-\+]/g, '').replace(/^2/, '');
    })
    .matches(/^01[0125]{1}[0-9]{8}$/)
    .withMessage('Please provide a valid Egyptian mobile number (010, 011, 012, or 015) | يرجى إدخال رقم هاتف محمول مصري صحيح (٠١٠، ٠١١، ٠١٢، أو ٠١٥)')
    .isLength({ min: 11, max: 11 })
    .withMessage('Phone number must be 11 digits | رقم الهاتف يجب أن يكون ١١ رقم');
  
  return required ? validation.notEmpty().withMessage('Phone number is required | رقم الهاتف مطلوب') : validation.optional();
};

// Enhanced password validation with security logging
const passwordValidation = () => [
  body('password')
    .isLength({ min: 8, max: 128 })
    .withMessage('Password must be between 8 and 128 characters | كلمة المرور يجب أن تكون بين ٨ و ١٢٨ حرف')
    .matches(/^(?=.*[a-zA-Z])(?=.*\d)[a-zA-Z\d]+$/)
    .withMessage('Password must contain at least one letter and one number (letters and numbers only) | كلمة المرور يجب أن تحتوي على حرف واحد ورقم واحد على الأقل (أحرف وأرقام فقط)')
    .custom((password, { req }) => {
      // Additional security checks with logging
      const commonPasswords = ['password', '12345678', 'qwerty123', 'abc12345', 'password123', 'admin123'];
      
      if (commonPasswords.some(common => password.toLowerCase().includes(common))) {
        console.warn(`[SECURITY] Common password attempt from IP: ${req.ip}`, {
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          timestamp: new Date().toISOString()
        });
        
        throw new Error('Password is too common. Please choose a more secure password | كلمة المرور شائعة جداً. يرجى اختيار كلمة مرور أكثر أماناً');
      }
      
      return true;
    })
];

// Validation rules for user registration
const registerValidation = [
  ...enhancedEmailValidation(false), // Enable duplicate check for registration
  
  ...passwordValidation(),
    
  nameValidation('firstName', 'الاسم الأول', true),
  
  nameValidation('lastName', 'اسم العائلة', true),
  
  phoneValidation(true)
    .custom(async (phone, { req }) => {
      // Check for duplicate phone number
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();
      
      try {
        const existingUser = await prisma.user.findUnique({
          where: { phone: phone }
        });
        
        if (existingUser) {
          console.warn(`[SECURITY] Duplicate phone registration attempt: ${phone} from IP: ${req.ip}`, {
            phone: phone,
            ip: req.ip,
            timestamp: new Date().toISOString()
          });
          
          throw new Error('Phone number already registered | رقم الهاتف مسجل مسبقاً');
        }
        
        return true;
      } catch (error) {
        if (error.message.includes('already registered')) {
          throw error;
        }
        // If it's a database error, let it pass (don't block registration)
        return true;
      } finally {
        await prisma.$disconnect();
      }
    }),
  
  validate
];

// Validation rules for user login
const loginValidation = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required | البريد الإلكتروني مطلوب')
    .isEmail()
    .withMessage('Please provide a valid email address | يرجى إدخال بريد إلكتروني صحيح')
    .normalizeEmail(),
  
  body('password')
    .trim()
    .notEmpty()
    .withMessage('Password is required | كلمة المرور مطلوبة'),
  
  validate
];

// Validation rules for password reset request
const forgotPasswordValidation = [
  ...enhancedEmailValidation(true), // Skip duplicate check for password reset
  
  validate
];

// Validation rules for password reset
const resetPasswordValidation = [
  ...passwordValidation(),
  
  body('token')
    .trim()
    .notEmpty()
    .withMessage('Reset token is required | رمز إعادة التعيين مطلوب')
    .isLength({ min: 32, max: 256 })
    .withMessage('Invalid reset token format | صيغة رمز إعادة التعيين غير صحيحة')
    .matches(/^[a-zA-Z0-9]+$/)
    .withMessage('Reset token contains invalid characters | رمز إعادة التعيين يحتوي على أحرف غير صحيحة'),
  
  validate
];

const resendVerificationValidation = [
  ...enhancedEmailValidation(true), // Skip duplicate check for resend verification
  
  validate
];

// Validation for driver commission
const driverCommissionValidation = [
  body('commission')
    .isNumeric()
    .withMessage('Commission must be a number | العمولة يجب أن تكون رقم')
    .isFloat({ min: 20.0, max: 100.0 })
    .withMessage('Driver commission must be between 20.00 and 100.00 EGP | عمولة السائق يجب أن تكون بين ٢٠ و ١٠٠ جنيه')
    .custom((value) => {
      // Ensure max 2 decimal places
      if (!Number.isInteger(value * 100)) {
        throw new Error('Commission can have maximum 2 decimal places | العمولة يمكن أن تحتوي على خانتين عشريتين كحد أقصى');
      }
      return true;
    }),
  
  validate
];

// Validation for creating driver
const createDriverValidation = [
  ...enhancedEmailValidation(false), // Enable duplicate check for driver creation
  
  ...passwordValidation(),
  
  nameValidation('firstName', 'الاسم الأول', true),
  
  nameValidation('lastName', 'اسم العائلة', true),
  
  phoneValidation(true),
  
  body('licenseNumber')
    .trim()
    .notEmpty()
    .withMessage('License number is required | رقم الرخصة مطلوب')
    .escape() // Prevent XSS
    .isLength({ min: 5, max: 20 })
    .withMessage('License number must be between 5 and 20 characters | رقم الرخصة يجب أن يكون بين ٥ و ٢٠ حرف')
    .matches(/^[A-Z0-9\-]+$/i)
    .withMessage('License number can only contain letters, numbers, and hyphens | رقم الرخصة يمكن أن يحتوي على أحرف وأرقام وشرطات فقط'),
  
  body('deliveryCommission')
    .optional()
    .isNumeric()
    .withMessage('Commission must be a number | العمولة يجب أن تكون رقم')
    .isFloat({ min: 20.0, max: 100.0 })
    .withMessage('Driver commission must be between 20.00 and 100.00 EGP | عمولة السائق يجب أن تكون بين ٢٠ و ١٠٠ جنيه'),
  
  validate
];

// Validation for driver ID parameter
const driverIdValidation = [
  param('id')
    .isUUID(4)
    .withMessage('Invalid driver ID format | معرف السائق غير صحيح')
    .escape(), // Prevent XSS in URL params
  
  validate
];

const updateOutsourceCommissionValidation = [
  param('userId')
    .isUUID(4)
    .withMessage('Valid user ID is required | معرف المستخدم مطلوب وصحيح')
    .escape(),
    
  body('deliveryCommission')
    .isNumeric()
    .withMessage('Commission must be a number | العمولة يجب أن تكون رقم')
    .isFloat({ min: 10.0, max: 200.0 })
    .withMessage('Outsource commission must be between 10.00 and 200.00 EGP per order | عمولة الشريك الخارجي يجب أن تكون بين ١٠ و ٢٠٠ جنيه لكل طلب')
    .custom((value) => {
      // Ensure max 2 decimal places
      if (!Number.isInteger(value * 100)) {
        throw new Error('Commission can have maximum 2 decimal places | العمولة يمكن أن تحتوي على خانتين عشريتين كحد أقصى');
      }
      return true;
    }),
    
  validate
];

// Validation for profile updates
const updateProfileValidation = [
  nameValidation('firstName', 'الاسم الأول', false),
  
  nameValidation('lastName', 'اسم العائلة', false),
  
  phoneValidation(false)
    .custom(async (phone, { req }) => {
      if (!phone) return true; // Skip if not provided
      
      // Check for duplicate phone number (exclude current user)
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();
      
      try {
        const existingUser = await prisma.user.findFirst({
          where: { 
            phone: phone,
            id: { not: req.user?.id } // Exclude current user
          }
        });
        
        if (existingUser) {
          throw new Error('Phone number already registered by another user | رقم الهاتف مسجل بواسطة مستخدم آخر');
        }
        
        return true;
      } catch (error) {
        if (error.message.includes('already registered')) {
          throw error;
        }
        // If it's a database error, let it pass
        return true;
      } finally {
        await prisma.$disconnect();
      }
    }),
  
  body('address')
    .optional()
    .trim()
    .escape() // Prevent XSS
    .isLength({ min: 10, max: 200 })
    .withMessage('Address must be between 10 and 200 characters | العنوان يجب أن يكون بين ١٠ و ٢٠٠ حرف')
    .matches(/^[a-zA-Z0-9\u0600-\u06FF\s\.,\-#\/]+$/)
    .withMessage('Address contains invalid characters | العنوان يحتوي على أحرف غير صحيحة'),
  
  body('postalCode')
    .optional()
    .trim()
    .escape()
    .matches(/^[0-9]{5}$/)
    .withMessage('Postal code must be exactly 5 digits | الرمز البريدي يجب أن يكون ٥ أرقام بالضبط'),
  
  body('companyName')
    .optional()
    .trim()
    .escape() // Prevent XSS
    .isLength({ min: 2, max: 100 })
    .withMessage('Company name must be between 2 and 100 characters | اسم الشركة يجب أن يكون بين ٢ و ١٠٠ حرف')
    .matches(/^[a-zA-Z0-9\u0600-\u06FF\s&.\-,()]+$/)
    .withMessage('Company name contains invalid characters | اسم الشركة يحتوي على أحرف غير صحيحة'),
  
  validate
];

// Search and pagination validation
const searchValidation = [
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
    .matches(/^[a-zA-Z0-9\u0600-\u06FF\s\-@.]+$/)
    .withMessage('Search term contains invalid characters | مصطلح البحث يحتوي على أحرف غير صحيحة'),
  
  body('role')
    .optional()
    .isIn(['ADMIN', 'MERCHANT', 'DRIVER', 'CUSTOMER', 'OUTSOURCE'])
    .withMessage('Invalid role filter | فلتر دور غير صحيح'),
  
  body('status')
    .optional()
    .isIn(['ACTIVE', 'SUSPENDED', 'INACTIVE', 'PENDING_VERIFICATION'])
    .withMessage('Invalid status filter | فلتر حالة غير صحيح'),
  
  validate
];

// Role transition validation
const roleTransitionValidation = [
  param('id')
    .isUUID(4)
    .withMessage('Invalid user ID | معرف المستخدم غير صحيح')
    .escape(),
  
  body('role')
    .trim()
    .notEmpty()
    .withMessage('Role is required | الدور مطلوب')
    .isIn(['CUSTOMER', 'MERCHANT', 'DRIVER', 'OUTSOURCE'])
    .withMessage('Invalid role specified | دور غير صحيح')
    .custom((newRole, { req }) => {
      // Define allowed transitions (business rules)
      const allowedTransitions = {
        CUSTOMER: ['MERCHANT', 'DRIVER'],
        MERCHANT: ['DRIVER'],
        DRIVER: ['MERCHANT'],
        OUTSOURCE: [], // No transitions allowed
        ADMIN: [] // No transitions allowed
      };
      
      // Note: currentRole would need to be fetched from database in real implementation
      // This is a placeholder for business logic validation
      return true;
    }),
  
  body('reason')
    .optional()
    .trim()
    .escape()
    .isLength({ min: 10, max: 500 })
    .withMessage('Reason must be between 10 and 500 characters | السبب يجب أن يكون بين ١٠ و ٥٠٠ حرف'),
  
  validate
];

// Status update validation
const statusUpdateValidation = [
  param('id')
    .isUUID(4)
    .withMessage('Invalid user ID | معرف المستخدم غير صحيح')
    .escape(),
  
  body('status')
    .trim()
    .notEmpty()
    .withMessage('Status is required | الحالة مطلوبة')
    .isIn(['ACTIVE', 'SUSPENDED', 'INACTIVE', 'PENDING_VERIFICATION'])
    .withMessage('Invalid status specified | حالة غير صحيحة')
    .custom((newStatus, { req }) => {
      // Business rules for status changes
      if (newStatus === 'SUSPENDED' && !req.body.reason) {
        throw new Error('Suspension reason is required | سبب الإيقاف مطلوب');
      }
      return true;
    }),
  
  body('reason')
    .if(body('status').equals('SUSPENDED'))
    .notEmpty()
    .withMessage('Suspension reason is required | سبب الإيقاف مطلوب')
    .trim()
    .escape()
    .isLength({ min: 10, max: 500 })
    .withMessage('Reason must be between 10 and 500 characters | السبب يجب أن يكون بين ١٠ و ٥٠٠ حرف'),
  
  validate
];

module.exports = {
  registerValidation,
  loginValidation,
  forgotPasswordValidation,
  resetPasswordValidation,
  resendVerificationValidation,
  driverCommissionValidation,
  createDriverValidation,
  driverIdValidation,
  updateOutsourceCommissionValidation,
  updateProfileValidation,
  searchValidation,
  roleTransitionValidation,
  statusUpdateValidation,
  // Helper functions for reuse
  enhancedEmailValidation,
  nameValidation,
  phoneValidation,
  passwordValidation
};