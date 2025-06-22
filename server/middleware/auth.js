const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Middleware to protect routes that require authentication
 */
const protect = async (req, res, next) => {
  try {
    let token;
    
    // Get token from Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    
    if (!token) {
      return res.status(401).json({ 
        message: 'Not authorized to access this route' 
      });
    }
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
        permissions: true,
        isEmailVerified: true
      }
    });
    
    if (!user) {
      return res.status(401).json({ 
        message: 'User not found with this id' 
      });
    }
    
    if (user.status !== 'ACTIVE') {
      return res.status(401).json({ 
        message: 'Account is not active. Please contact support.'
      });
    }
    
    // Add user to request object
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired' });
    }
    return res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Middleware to restrict access to certain roles
 */
const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        message: 'You do not have permission to perform this action' 
      });
    }
    next();
  };
};

/**
 * Middleware to check specific permissions
 */
const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.user || !req.user.permissions) {
      return res.status(403).json({ 
        message: 'Access denied: No permissions found' 
      });
    }
    
    if (!req.user.permissions[permission]) {
      return res.status(403).json({ 
        message: `Access denied: ${permission} permission required` 
      });
    }
    
    next();
  };
};

/**
 * Middleware to ensure resource ownership for merchants/customers
 */
const requireOwnership = (resourceType) => {
  return (req, res, next) => {
    // Admins can access everything
    if (req.user.role === 'ADMIN') {
      return next();
    }
    
    // For merchants and customers, add user filter to queries
    if (req.user.role === 'MERCHANT' || req.user.role === 'CUSTOMER') {
      // Add userId to request for filtering
      req.resourceOwnerId = req.user.id;
      
      // For specific resource access (like GET /orders/:id)
      if (req.params.id) {
        req.requireOwnershipCheck = {
          resourceType,
          resourceId: req.params.id,
          userId: req.user.id
        };
      }
    }
    
    next();
  };
};

/**
 * Public access (no authentication required)
 */
const publicAccess = (req, res, next) => {
  // Skip authentication for public endpoints
  next();
};

// REPLACE THE DUPLICATE EXPORTS WITH THIS SINGLE ONE:
module.exports = { 
  protect, 
  restrictTo, 
  requirePermission, 
  requireOwnership, 
  publicAccess 
};