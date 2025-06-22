const express = require('express');
const router = express.Router();
const userController = require('./controller');
const { 
  protect, 
  restrictTo, 
  requirePermission 
} = require('../../middleware/auth');
const { 
  registerValidation, 
  loginValidation, 
  forgotPasswordValidation, 
  resetPasswordValidation,
  resendVerificationValidation,
  driverCommissionValidation,
  createDriverValidation,
  driverIdValidation,
  updateOutsourceCommissionValidation
} = require('./validators');

// ================================================================
// PUBLIC ROUTES (No Authentication Required)
// ================================================================
router.post('/register', registerValidation, userController.register);
router.post('/login', loginValidation, userController.login);
router.get('/verify-email/:token', userController.verifyEmail);
router.post('/resend-verification', resendVerificationValidation, userController.resendVerification);
router.post('/forgot-password', forgotPasswordValidation, userController.forgotPassword);
router.post('/reset-password', resetPasswordValidation, userController.resetPassword);

// ================================================================
// PROTECTED ROUTES - USER PROFILE (Authenticated Users)
// ================================================================
router.get('/me', protect, userController.getProfile);
router.put('/me', protect, userController.updateProfile);

// ================================================================
// PROTECTED ROUTES - USER SETTLEMENTS (Authenticated Users)
// ================================================================
router.get('/my-settlement', protect, userController.getCurrentSettlement);
router.get('/settlement-history', protect, userController.getSettlementHistory);

// ================================================================
// ADMIN ROUTES - DRIVER MANAGEMENT (Admin Only)
// ================================================================
// Create driver
router.post('/drivers', protect, restrictTo('ADMIN'), createDriverValidation, userController.createDriver);

// Driver commission management
router.get('/drivers/:id/commission', protect, restrictTo('ADMIN'), driverIdValidation, userController.getDriverCommission);
router.put('/drivers/:id/commission', protect, restrictTo('ADMIN'), driverIdValidation, driverCommissionValidation, userController.updateDriverCommission);

// Driver performance
router.get('/drivers/:id/performance', protect, restrictTo('ADMIN'), driverIdValidation, userController.getDriverPerformance);

// Get all drivers (MUST be after specific driver routes)
router.get('/drivers', protect, restrictTo('ADMIN'), userController.getAllDrivers);

// ================================================================
// ADMIN ROUTES - OUTSOURCE MANAGEMENT (Admin Only)
// ================================================================
// Get all outsource commissions
router.get('/outsource/commissions', protect, restrictTo('ADMIN'), userController.getAllOutsourceCommissions);

// Update outsource commission
router.put('/outsource/:userId/commission', protect, restrictTo('ADMIN'), updateOutsourceCommissionValidation, userController.updateOutsourceCommission);

// ================================================================
// ADMIN ROUTES - USER MANAGEMENT (Admin Only)
// ================================================================
// User statistics and search
router.get('/statistics', protect, restrictTo('ADMIN'), userController.getUserStatistics);
router.get('/search', protect, restrictTo('ADMIN'), userController.searchUsers);

// User promotions
router.get('/pending-promotion', protect, requirePermission('canPromoteUsers'), userController.getPendingPromotions);
router.put('/:id/promote', protect, requirePermission('canPromoteUsers'), userController.promoteUser);

// Get all users (root endpoint)
router.get('/', protect, restrictTo('ADMIN'), userController.getAllUsers);

// ================================================================
// ADMIN ROUTES - SPECIFIC USER OPERATIONS (Admin Only)
// These MUST be last because /:id catches everything
// ================================================================
router.get('/:id', protect, restrictTo('ADMIN'), userController.getUserById);
router.put('/:id', protect, restrictTo('ADMIN'), userController.updateUserByAdmin);
router.delete('/:id', protect, restrictTo('ADMIN'), userController.deleteUser);

module.exports = router;