const express = require('express');
const { body, query } = require('express-validator'); // ADD THIS LINE
const FinancialController = require('./controller');
const { protect, restrictTo } = require('../../middleware/auth');
const {
  createSettlementValidation,
  createManualTransactionValidation,
  merchantIdValidation,
  queryValidation,
  validate
} = require('./validators');

const router = express.Router();

// Apply authentication to all routes
router.use(protect);

// ====================
// ADMIN ONLY ROUTES
// ====================

// Financial Processing
router.post('/process-deliveries', 
  restrictTo('ADMIN'), 
  FinancialController.processDeliveredOrders
);

// Transaction Management (Admin)
router.get('/transactions', 
  restrictTo('ADMIN'), 
  queryValidation, 
  validate, 
  FinancialController.getAllTransactions
);

router.get('/transactions/:id', 
  restrictTo('ADMIN'), 
  FinancialController.getTransactionById
);

router.post('/transactions', 
  restrictTo('ADMIN'), 
  createManualTransactionValidation, 
  validate, 
  FinancialController.createManualTransaction
);

// Balance Management (Admin)
router.get('/balances', 
  restrictTo('ADMIN'), 
  FinancialController.getAllMerchantBalances
);

router.get('/balance/:merchantId', 
  restrictTo('ADMIN'), 
  merchantIdValidation, 
  validate, 
  FinancialController.getMerchantBalance
);

router.put('/balance/:merchantId/update', 
  restrictTo('ADMIN'), 
  merchantIdValidation, 
  validate, 
  FinancialController.updateMerchantBalance
);

// Settlement Management (Admin)
router.get('/settlements', 
  restrictTo('ADMIN'), 
  queryValidation, 
  validate, 
  FinancialController.getAllSettlements
);

router.get('/settlements/:id', 
  restrictTo('ADMIN'), 
  FinancialController.getSettlementById
);

router.post('/settlements', 
  restrictTo('ADMIN'), 
  createSettlementValidation, 
  validate, 
  FinancialController.createSettlement
);

router.post('/settle/:merchantId', 
  restrictTo('ADMIN'), 
  merchantIdValidation, 
  validate,
  [
    body('paymentMethod')
      .notEmpty()
      .withMessage('Payment method is required')
      .isIn(['CASH', 'BANK_TRANSFER', 'MOBILE_WALLET'])
      .withMessage('Payment method must be CASH, BANK_TRANSFER, or MOBILE_WALLET'),
    body('notes')
      .optional()
      .isLength({ max: 500 })
      .withMessage('Notes must not exceed 500 characters')
  ],
  validate,
  FinancialController.settleMerchant
);

// Financial Reports (Admin)
router.get('/statistics', 
  restrictTo('ADMIN'), 
  FinancialController.getFinancialStatistics
);

router.get('/driver-earnings', 
  restrictTo('ADMIN'), 
  [
    query('startDate')
      .optional()
      .isISO8601()
      .withMessage('Start date must be a valid date'),
    query('endDate')
      .optional()
      .isISO8601()
      .withMessage('End date must be a valid date'),
    query('driverId')
      .optional()
      .isUUID()
      .withMessage('Driver ID must be a valid UUID')
  ],
  validate,
  FinancialController.getDriverEarnings
);

router.get('/statement/:merchantId', 
  restrictTo('ADMIN'), 
  merchantIdValidation, 
  validate, 
  FinancialController.getMerchantStatement
);

// ====================
// MERCHANT ROUTES
// ====================

// My Financial Data (Merchant)
router.get('/my-balance', 
  restrictTo('MERCHANT'), 
  FinancialController.getMyBalance
);

router.get('/my-transactions', 
  restrictTo('MERCHANT'), 
  queryValidation, 
  validate, 
  FinancialController.getMyTransactions
);

router.get('/my-settlements', 
  restrictTo('MERCHANT'), 
  queryValidation, 
  validate, 
  FinancialController.getMySettlements
);

router.get('/my-statement', 
  restrictTo('MERCHANT'), 
  FinancialController.getMyStatement
);

router.put('/my-balance/update', 
  restrictTo('MERCHANT'), 
  FinancialController.updateMerchantBalance
);

// ====================
// SHARED ROUTES (Admin + Merchant)
// ====================

// Balance access (Admin sees any, Merchant sees own)
router.get('/balance', (req, res, next) => {
  if (req.user.role === 'ADMIN') {
    return FinancialController.getAllMerchantBalances(req, res, next);
  } else if (req.user.role === 'MERCHANT') {
    return FinancialController.getMyBalance(req, res, next);
  } else {
    return res.status(403).json({
      success: false,
      message: 'Access denied'
    });
  }
});

// Transaction access (Admin sees all, Merchant sees own)
router.get('/my-transactions-filter', 
  restrictTo('MERCHANT', 'ADMIN'),
  queryValidation,
  validate,
  (req, res, next) => {
    if (req.user.role === 'ADMIN') {
      return FinancialController.getAllTransactions(req, res, next);
    } else {
      return FinancialController.getMyTransactions(req, res, next);
    }
  }
);

router.get('/drivers/balances', 
  restrictTo('ADMIN'), 
  FinancialController.getAllDriverBalances
);

router.get('/drivers/:driverId/balance', 
  restrictTo('ADMIN'), 
  FinancialController.getDriverBalance
);

router.get('/drivers/earnings', 
  restrictTo('ADMIN'), 
  [
    query('driverId')
      .optional()
      .isUUID()
      .withMessage('Driver ID must be a valid UUID')
  ],
  validate,
  FinancialController.getDriverEarnings
);

router.post('/settlements/driver', 
  restrictTo('ADMIN'),
  [
    body('driverId')
      .notEmpty()
      .withMessage('Driver ID is required')
      .isUUID()
      .withMessage('Driver ID must be a valid UUID'),
    body('amount')
      .notEmpty()
      .withMessage('Amount is required')
      .isNumeric()
      .withMessage('Amount must be a number'),
    body('paymentMethod')
      .notEmpty()
      .withMessage('Payment method is required')
      .isIn(['CASH', 'BANK_TRANSFER', 'MOBILE_WALLET'])
      .withMessage('Payment method must be CASH, BANK_TRANSFER, or MOBILE_WALLET'),
    body('notes')
      .optional()
      .isLength({ max: 500 })
      .withMessage('Notes must not exceed 500 characters')
  ],
  validate,
  FinancialController.createDriverSettlement
);

module.exports = router;