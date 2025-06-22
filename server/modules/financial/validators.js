const { body, query, param, validationResult } = require('express-validator');

// Validation middleware (same pattern as Order module)
const validate = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map(error => ({
      field: error.path || error.param,
      message: error.msg,
      value: error.value
    }));

    return res.status(400).json({
      success: false,
      message: 'Validation errors',
      messageAr: 'أخطاء في التحقق من صحة البيانات',
      errors: formattedErrors
    });
  }
  
  next();
};

// Settlement creation validation
const createSettlementValidation = [
  body('merchantId')
    .notEmpty()
    .withMessage('Merchant ID is required')
    .withMessage('معرف التاجر مطلوب')
    .isUUID()
    .withMessage('Merchant ID must be a valid UUID')
    .withMessage('معرف التاجر يجب أن يكون UUID صحيح'),

  body('amount')
    .notEmpty()
    .withMessage('Amount is required')
    .withMessage('المبلغ مطلوب')
    .isNumeric()
    .withMessage('Amount must be a number')
    .withMessage('المبلغ يجب أن يكون رقم')
    .custom((value) => {
      if (parseFloat(value) <= 0) {
        throw new Error('Amount must be greater than zero');
      }
      if (parseFloat(value) > 1000000) {
        throw new Error('Amount cannot exceed 1,000,000 EGP');
      }
      return true;
    }),

  body('paymentMethod')
    .notEmpty()
    .withMessage('Payment method is required')
    .withMessage('طريقة الدفع مطلوبة')
    .isIn(['CASH', 'BANK_TRANSFER', 'MOBILE_WALLET'])
    .withMessage('Payment method must be CASH, BANK_TRANSFER, or MOBILE_WALLET')
    .withMessage('طريقة الدفع يجب أن تكون نقدي أو تحويل بنكي أو محفظة موبايل'),

  body('notes')
    .optional()
    .isLength({ min: 0, max: 500 })
    .withMessage('Notes must not exceed 500 characters')
    .withMessage('الملاحظات يجب ألا تتجاوز 500 حرف')
    .trim()
];

// Manual transaction creation validation
const createManualTransactionValidation = [
  body('merchantId')
    .notEmpty()
    .withMessage('Merchant ID is required')
    .withMessage('معرف التاجر مطلوب')
    .isUUID()
    .withMessage('Merchant ID must be a valid UUID')
    .withMessage('معرف التاجر يجب أن يكون UUID صحيح'),

  body('type')
    .notEmpty()
    .withMessage('Transaction type is required')
    .withMessage('نوع المعاملة مطلوب')
    .isIn(['DELIVERY_FEE_OWED', 'PRODUCT_PAYMENT_OWED', 'REFUND', 'ADJUSTMENT', 'COMMISSION'])
    .withMessage('Invalid transaction type')
    .withMessage('نوع المعاملة غير صحيح'),

  body('amount')
    .notEmpty()
    .withMessage('Amount is required')
    .withMessage('المبلغ مطلوب')
    .isNumeric()
    .withMessage('Amount must be a number')
    .withMessage('المبلغ يجب أن يكون رقم')
    .custom((value) => {
      const amount = parseFloat(value);
      if (amount === 0) {
        throw new Error('Amount cannot be zero');
      }
      if (Math.abs(amount) > 1000000) {
        throw new Error('Amount cannot exceed 1,000,000 EGP');
      }
      return true;
    }),

  body('description')
    .notEmpty()
    .withMessage('Description is required')
    .withMessage('الوصف مطلوب')
    .isLength({ min: 5, max: 200 })
    .withMessage('Description must be between 5 and 200 characters')
    .withMessage('الوصف يجب أن يكون بين 5 و 200 حرف')
    .trim(),

  body('descriptionAr')
    .optional()
    .isLength({ min: 0, max: 200 })
    .withMessage('Arabic description must not exceed 200 characters')
    .withMessage('الوصف العربي يجب ألا يتجاوز 200 حرف')
    .trim(),

  body('orderId')
    .optional()
    .isUUID()
    .withMessage('Order ID must be a valid UUID')
    .withMessage('معرف الطلب يجب أن يكون UUID صحيح')
];

// Merchant ID parameter validation
const merchantIdValidation = [
  param('merchantId')
    .notEmpty()
    .withMessage('Merchant ID is required')
    .withMessage('معرف التاجر مطلوب')
    .isUUID()
    .withMessage('Merchant ID must be a valid UUID')
    .withMessage('معرف التاجر يجب أن يكون UUID صحيح')
];

// Transaction ID parameter validation
const transactionIdValidation = [
  param('id')
    .notEmpty()
    .withMessage('Transaction ID is required')
    .withMessage('معرف المعاملة مطلوب')
    .isUUID()
    .withMessage('Transaction ID must be a valid UUID')
    .withMessage('معرف المعاملة يجب أن يكون UUID صحيح')
];

// Settlement ID parameter validation
const settlementIdValidation = [
  param('id')
    .notEmpty()
    .withMessage('Settlement ID is required')
    .withMessage('معرف التسوية مطلوب')
    .isUUID()
    .withMessage('Settlement ID must be a valid UUID')
    .withMessage('معرف التسوية يجب أن يكون UUID صحيح')
];

// Query parameters validation (pagination, filtering, sorting)
const queryValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer')
    .withMessage('رقم الصفحة يجب أن يكون رقم صحيح موجب'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
    .withMessage('الحد الأقصى يجب أن يكون بين 1 و 100'),

  query('merchantId')
    .optional()
    .isUUID()
    .withMessage('Merchant ID must be a valid UUID')
    .withMessage('معرف التاجر يجب أن يكون UUID صحيح'),

  query('type')
    .optional()
    .isIn(['DELIVERY_FEE_OWED', 'PRODUCT_PAYMENT_OWED', 'REFUND', 'ADJUSTMENT', 'COMMISSION', 'SETTLEMENT'])
    .withMessage('Invalid transaction type')
    .withMessage('نوع المعاملة غير صحيح'),

  query('status')
    .optional()
    .isIn(['PENDING', 'SETTLED', 'CANCELLED'])
    .withMessage('Status must be PENDING, SETTLED, or CANCELLED')
    .withMessage('الحالة يجب أن تكون معلقة أو مسددة أو ملغية'),

  query('sortBy')
    .optional()
    .isIn(['createdAt', 'amount', 'transactionNumber', 'settledAt'])
    .withMessage('Sort by must be createdAt, amount, transactionNumber, or settledAt')
    .withMessage('الترتيب يجب أن يكون حسب تاريخ الإنشاء أو المبلغ أو رقم المعاملة أو تاريخ التسوية'),

  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sort order must be asc or desc')
    .withMessage('ترتيب الفرز يجب أن يكون تصاعدي أو تنازلي'),

  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid date')
    .withMessage('تاريخ البداية يجب أن يكون تاريخ صحيح'),

  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid date')
    .withMessage('تاريخ النهاية يجب أن يكون تاريخ صحيح')
    .custom((endDate, { req }) => {
      if (req.query.startDate && endDate) {
        const start = new Date(req.query.startDate);
        const end = new Date(endDate);
        if (end <= start) {
          throw new Error('End date must be after start date');
        }
      }
      return true;
    }),

  query('search')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('Search term must be between 1 and 100 characters')
    .withMessage('كلمة البحث يجب أن تكون بين 1 و 100 حرف')
    .trim()
];

// Driver earnings query validation
const driverEarningsQueryValidation = [
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid date')
    .withMessage('تاريخ البداية يجب أن يكون تاريخ صحيح'),

  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid date')
    .withMessage('تاريخ النهاية يجب أن يكون تاريخ صحيح')
    .custom((endDate, { req }) => {
      if (req.query.startDate && endDate) {
        const start = new Date(req.query.startDate);
        const end = new Date(endDate);
        if (end <= start) {
          throw new Error('End date must be after start date');
        }
        // Validate date range is not more than 1 year
        const diffTime = Math.abs(end - start);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays > 365) {
          throw new Error('Date range cannot exceed 1 year');
        }
      }
      return true;
    }),

  query('driverId')
    .optional()
    .isUUID()
    .withMessage('Driver ID must be a valid UUID')
    .withMessage('معرف السائق يجب أن يكون UUID صحيح')
];

// Settlement update validation
const updateSettlementValidation = [
  body('paymentMethod')
    .optional()
    .isIn(['CASH', 'BANK_TRANSFER', 'MOBILE_WALLET'])
    .withMessage('Payment method must be CASH, BANK_TRANSFER, or MOBILE_WALLET')
    .withMessage('طريقة الدفع يجب أن تكون نقدي أو تحويل بنكي أو محفظة موبايل'),

  body('notes')
    .optional()
    .isLength({ min: 0, max: 500 })
    .withMessage('Notes must not exceed 500 characters')
    .withMessage('الملاحظات يجب ألا تتجاوز 500 حرف')
    .trim(),

  body('status')
    .optional()
    .isIn(['COMPLETED', 'CANCELLED'])
    .withMessage('Status must be COMPLETED or CANCELLED')
    .withMessage('الحالة يجب أن تكون مكتملة أو ملغية')
];

// Financial report validation
const financialReportValidation = [
  query('reportType')
    .optional()
    .isIn(['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY', 'CUSTOM'])
    .withMessage('Report type must be DAILY, WEEKLY, MONTHLY, YEARLY, or CUSTOM')
    .withMessage('نوع التقرير يجب أن يكون يومي أو أسبوعي أو شهري أو سنوي أو مخصص'),

  query('startDate')
    .if(query('reportType').equals('CUSTOM'))
    .notEmpty()
    .withMessage('Start date is required for custom reports')
    .withMessage('تاريخ البداية مطلوب للتقارير المخصصة')
    .isISO8601()
    .withMessage('Start date must be a valid date')
    .withMessage('تاريخ البداية يجب أن يكون تاريخ صحيح'),

  query('endDate')
    .if(query('reportType').equals('CUSTOM'))
    .notEmpty()
    .withMessage('End date is required for custom reports')
    .withMessage('تاريخ النهاية مطلوب للتقارير المخصصة')
    .isISO8601()
    .withMessage('End date must be a valid date')
    .withMessage('تاريخ النهاية يجب أن يكون تاريخ صحيح'),

  query('format')
    .optional()
    .isIn(['JSON', 'PDF', 'EXCEL'])
    .withMessage('Format must be JSON, PDF, or EXCEL')
    .withMessage('التنسيق يجب أن يكون JSON أو PDF أو EXCEL')
];

// Amount validation helper
const validateAmount = (fieldName, isRequired = true) => {
  const validation = body(fieldName);
  
  if (isRequired) {
    validation.notEmpty()
      .withMessage(`${fieldName} is required`)
      .withMessage(`${fieldName} مطلوب`);
  } else {
    validation.optional();
  }
  
  return validation
    .isNumeric()
    .withMessage(`${fieldName} must be a number`)
    .withMessage(`${fieldName} يجب أن يكون رقم`)
    .custom((value) => {
      if (value !== undefined && value !== null && value !== '') {
        const amount = parseFloat(value);
        if (amount < 0) {
          throw new Error(`${fieldName} cannot be negative`);
        }
        if (amount > 10000000) {
          throw new Error(`${fieldName} cannot exceed 10,000,000 EGP`);
        }
      }
      return true;
    });
};

// Egyptian financial validation helpers
const validateEgyptianPaymentMethod = (fieldName) => {
  return body(fieldName)
    .isIn(['CASH', 'BANK_TRANSFER', 'MOBILE_WALLET', 'FAWRY', 'VODAFONE_CASH', 'ORANGE_MONEY'])
    .withMessage('Invalid Egyptian payment method')
    .withMessage('طريقة دفع مصرية غير صحيحة');
};

const validateEgyptianCurrency = (fieldName = 'currency') => {
  return body(fieldName)
    .optional()
    .equals('EGP')
    .withMessage('Currency must be EGP')
    .withMessage('العملة يجب أن تكون جنيه مصري');
};

module.exports = {
  validate,
  createSettlementValidation,
  createManualTransactionValidation,
  merchantIdValidation,
  transactionIdValidation,
  settlementIdValidation,
  queryValidation,
  driverEarningsQueryValidation,
  updateSettlementValidation,
  financialReportValidation,
  validateAmount,
  validateEgyptianPaymentMethod,
  validateEgyptianCurrency
};