const rateLimit = require('express-rate-limit');
const { RATE_LIMITS } = require('../config/constants');

// Bulk assignment rate limiter (balanced for free use)
const bulkAssignmentLimiter = rateLimit({
  windowMs: RATE_LIMITS.BULK_ASSIGNMENT.windowMs, // 5 minutes
  max: RATE_LIMITS.BULK_ASSIGNMENT.max, // 50 requests per 5 minutes
  message: {
    success: false,
    message: RATE_LIMITS.BULK_ASSIGNMENT.message,
    messageAr: RATE_LIMITS.BULK_ASSIGNMENT.messageAr,
    retryAfter: Math.ceil(RATE_LIMITS.BULK_ASSIGNMENT.windowMs / 1000 / 60) // minutes
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: RATE_LIMITS.BULK_ASSIGNMENT.message,
      messageAr: RATE_LIMITS.BULK_ASSIGNMENT.messageAr,
      retryAfter: Math.ceil(RATE_LIMITS.BULK_ASSIGNMENT.windowMs / 1000 / 60),
      limit: RATE_LIMITS.BULK_ASSIGNMENT.max,
      windowMs: RATE_LIMITS.BULK_ASSIGNMENT.windowMs
    });
  }
});

// Order creation rate limiter
const orderCreationLimiter = rateLimit({
  windowMs: RATE_LIMITS.ORDER_CREATION.windowMs, // 15 minutes
  max: RATE_LIMITS.ORDER_CREATION.max, // 200 requests per 15 minutes
  message: {
    success: false,
    message: RATE_LIMITS.ORDER_CREATION.message,
    messageAr: RATE_LIMITS.ORDER_CREATION.messageAr,
    retryAfter: Math.ceil(RATE_LIMITS.ORDER_CREATION.windowMs / 1000 / 60)
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: RATE_LIMITS.ORDER_CREATION.message,
      messageAr: RATE_LIMITS.ORDER_CREATION.messageAr,
      retryAfter: Math.ceil(RATE_LIMITS.ORDER_CREATION.windowMs / 1000 / 60),
      limit: RATE_LIMITS.ORDER_CREATION.max,
      windowMs: RATE_LIMITS.ORDER_CREATION.windowMs
    });
  }
});

module.exports = {
  bulkAssignmentLimiter,
  orderCreationLimiter
};