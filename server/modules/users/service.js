const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const emailService = require('../../utils/email');
const prisma = new PrismaClient();

class UserService {
  /**
   * Register a new user
   */
  async register(userData) {
    const { email, password, firstName, lastName, phone } = userData;
    
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });
    
    if (existingUser) {
      throw new Error('User already exists with this email');
    }
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    
    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        firstName,
        lastName,
        fullName: `${firstName} ${lastName}`,
        phone,
        role: 'CUSTOMER',
        status: 'PENDING_VERIFICATION',
        isEmailVerified: false,
        permissions: this._getDefaultPermissions('CUSTOMER')
      }
    });
    await this.sendVerificationEmail(user);
    // Generate email verification token (to be implemented)
    // await this.sendVerificationEmail(user);
    
    // Return user without password
    const { passwordHash: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }
  
  /**
   * Login user
   */
  async login(email, password) {
  // Find user
  const user = await prisma.user.findUnique({
    where: { email }
  });
  
  if (!user) {
    throw new Error('Invalid credentials');
  }
  
  // Check password
  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) {
    throw new Error('Invalid credentials');
  }
  
  // Check if user is active
  if (user.status !== 'ACTIVE' && user.status !== 'PENDING_VERIFICATION') {
    throw new Error('Your account is not active. Please contact support.');
  }
  
  // NEW: Check if email is verified
  if (!user.isEmailVerified) {
    throw new Error('Please verify your email address before logging in. Check your inbox for the verification email.');
  }
  
  // Update last login
  await prisma.user.update({
    where: { id: user.id },
    data: {
      lastLogin: new Date(),
      loginHistory: this._updateLoginHistory(user, { 
        timestamp: new Date(),
        ip: '127.0.0.1' // This would come from the request in real implementation
      })
    }
  });
  
  // Generate token
  const token = this._generateToken(user);
  
  // Return user without password
  const { passwordHash: _, ...userWithoutPassword } = user;
  return {
    user: userWithoutPassword,
    token
  };
}
  
  /**
 * Get default permissions for a role
 */
_getDefaultPermissions(role) {
  const permissions = {
    ADMIN: {
      // User Management
      canManageUsers: true,
      canPromoteUsers: true,
      canViewAllUsers: true,
      
      // Order Management  
      canManageAllOrders: true,
      canAssignDrivers: true,
      canViewAllOrders: true,
      
      // Vehicle Management
      canManageVehicles: true,
      canAssignVehicles: true,
      
      // Route Management
      canManageRoutes: true,
      canOptimizeRoutes: true,
      
      // Reports & Analytics
      canViewReports: true,
      canExportData: true,
      canViewDashboard: true
    },
    
    MERCHANT: {
      // User Management
      canManageUsers: false,
      canPromoteUsers: false,
      canViewAllUsers: false,
      
      // Order Management (Own orders only)
      canManageAllOrders: false,
      canManageOwnOrders: true,
      canViewOwnOrders: true,
      canViewAssignedDriver: true, // Can see driver details for their orders
      canAssignDrivers: false,
      
      // Vehicle Management
      canManageVehicles: false,
      canAssignVehicles: false,
      
      // Route Management
      canManageRoutes: false,
      canViewOwnRoutes: true, // Can see routes for their orders
      
      // Reports & Analytics
      canViewOwnReports: true,
      canViewDashboard: true,
      canExportData: false
    },
    
    DRIVER: {
      // User Management
      canManageUsers: false,
      canPromoteUsers: false,
      canViewAllUsers: false,
      
      // Order Management (Assigned orders only)
      canManageAllOrders: false,
      canManageOwnOrders: false,
      canViewAssignedOrders: true,
      canUpdateOrderStatus: true,
      canAssignDrivers: false,
      
      // Vehicle Management
      canManageVehicles: false,
      canViewAssignedVehicle: true,
      
      // Route Management
      canManageRoutes: false,
      canViewAssignedRoutes: true,
      canOptimizeRoutes: false,
      
      // Reports & Analytics
      canViewOwnReports: true,
      canViewDashboard: true,
      canExportData: false
    },
    
    CUSTOMER: {
      // User Management
      canManageUsers: false,
      canPromoteUsers: false,
      canViewAllUsers: false,
      
      // Order Management (Own orders only)
      canManageAllOrders: false,
      canManageOwnOrders: false,
      canViewOwnOrders: true,
      canTrackOrders: true,
      
      // Vehicle Management
      canManageVehicles: false,
      
      // Route Management
      canManageRoutes: false,
      
      // Reports & Analytics
      canViewOwnReports: false,
      canViewDashboard: false,
      canExportData: false
    }
  };
  
  return permissions[role] || permissions.CUSTOMER;
 }
  
  /**
   * Generate JWT token
   */
  _generateToken(user) {
    return jwt.sign(
      { 
        id: user.id,
        email: user.email,
        role: user.role
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );
  }
  
  /**
   * Update login history
   */
  _updateLoginHistory(user, loginInfo) {
    let history = user.loginHistory || [];
    
    // If not array (first login), initialize
    if (!Array.isArray(history)) {
      history = [];
    }
    
    // Add new login, keep last 10
    history.unshift(loginInfo);
    if (history.length > 10) {
      history = history.slice(0, 10);
    }
    
    return history;
  }

  // Add these methods inside your UserService class:

/**
 * Generate verification token
 */
async generateVerificationToken(userId) {
  // Create a random token
  const verificationToken = crypto.randomBytes(32).toString('hex');
  
  // Hash the token (for security)
  const hashedToken = crypto
    .createHash('sha256')
    .update(verificationToken)
    .digest('hex');
  
  // Save to database with expiration (24 hours)
  await prisma.user.update({
    where: { id: userId },
    data: {
      verificationToken: hashedToken,
      verificationTokenExpires: new Date(Date.now() + 24 * 60 * 60 * 1000)
    }
  });
  
  return verificationToken;
}

/**
 * Send verification email
 */
async sendVerificationEmail(user) {
  // Generate token
  const verificationToken = await this.generateVerificationToken(user.id);
  
  // Send email
  await emailService.sendVerificationEmail(user, verificationToken);
}

/**
 * Verify email with token
 */
async verifyEmail(token) {
  // Hash the token from the URL
  const hashedToken = crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');
  
  // Find user with this token
  const user = await prisma.user.findFirst({
    where: {
      verificationToken: hashedToken,
      verificationTokenExpires: { gt: new Date() }, // Token must not be expired
    }
  });
  
  if (!user) {
    throw new Error('Token is invalid or has expired');
  }
  
  // Update user to verified
  await prisma.user.update({
    where: { id: user.id },
    data: {
      isEmailVerified: true,
      status: 'ACTIVE',
      verificationToken: null,
      verificationTokenExpires: null
    }
  });
  
  return user;
}
  
/**
 * Request password reset
 */
async requestPasswordReset(email) {
  // Find user
  const user = await prisma.user.findUnique({
    where: { email }
  });
  
  if (!user) {
    throw new Error('No user found with that email address');
  }
  
  // Generate reset token
  const resetToken = crypto.randomBytes(32).toString('hex');
  
  // Hash the token
  const hashedToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
  
  // Save to database with expiration (1 hour)
  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordResetToken: hashedToken,
      passwordResetExpires: new Date(Date.now() + 60 * 30 * 1000) // 30 minutes
    }
  });
  
  // Send reset email
  await emailService.sendPasswordResetEmail(user, resetToken);
  
  return { message: 'Password reset email sent' };
}

/**
 * Reset password with token
 */
async resetPassword(token, newPassword) {
  // Hash the token from the URL
  const hashedToken = crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');
  
  // Find user with this token
  const user = await prisma.user.findFirst({
    where: {
      passwordResetToken: hashedToken,
      passwordResetExpires: { gt: new Date() }, // Token must not be expired
    }
  });
  
  if (!user) {
    throw new Error('Token is invalid or has expired');
  }
  
  // Hash new password
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(newPassword, salt);
  
  // Update user password and clear reset token
  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash,
      passwordResetToken: null,
      passwordResetExpires: null
    }
  });
  
  return { message: 'Password reset successful' };
}

/**
 * Get user by ID (Admin only)
 */
async getUserById(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      fullName: true,
      phone: true,
      role: true,
      status: true,
      isEmailVerified: true,
      address: true,
      city: true,
      state: true,
      country: true,
      postalCode: true,
      companyName: true,
      companyDetails: true,
      driverAvailability: true,
      licenseNumber: true,
      lastLogin: true,
      loginHistory: true,
      permissions: true,
      createdAt: true,
      updatedAt: true
    }
  });
  
  if (!user) {
    throw new Error('User not found');
  }
  
  return user;
}

/**
 * Update user by admin
 */
async updateUserByAdmin(userId, updateData) {
  const { role, status, permissions, ...userFields } = updateData;
  
  // Validate role if provided
  const validRoles = ['ADMIN', 'MERCHANT', 'DRIVER', 'CUSTOMER', 'OUTSOURCE'];
  if (role && !validRoles.includes(role)) {
    throw new Error('Invalid role specified');
  }
  
  // Validate status if provided
  const validStatuses = ['PENDING_VERIFICATION', 'ACTIVE', 'SUSPENDED', 'INACTIVE'];
  if (status && !validStatuses.includes(status)) {
    throw new Error('Invalid status specified');
  }
  
  // Build update object
  const updateObject = {};
  
  // Add user fields if provided
  Object.keys(userFields).forEach(key => {
    if (userFields[key] !== undefined) {
      updateObject[key] = userFields[key];
    }
  });
  
  // Add role if provided and update permissions accordingly
  if (role) {
    updateObject.role = role;
    updateObject.permissions = permissions || this._getDefaultPermissions(role);
  } else if (permissions) {
    updateObject.permissions = permissions;
  }
  
  // Add status if provided
  if (status) {
    updateObject.status = status;
  }
  
  // Update full name if first or last name changed
  if (userFields.firstName || userFields.lastName) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { firstName: true, lastName: true }
    });
    
    const firstName = userFields.firstName || user.firstName;
    const lastName = userFields.lastName || user.lastName;
    updateObject.fullName = `${firstName} ${lastName}`;
  }
  
  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: updateObject,
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      fullName: true,
      phone: true,
      role: true,
      status: true,
      isEmailVerified: true,
      address: true,
      city: true,
      state: true,
      country: true,
      postalCode: true,
      companyName: true,
      permissions: true,
      updatedAt: true
    }
  });
  
  return updatedUser;
}

/**
 * Delete user (Admin only)
 */
async deleteUser(userId) {
  // Check if user exists
  const user = await prisma.user.findUnique({
    where: { id: userId }
  });
  
  if (!user) {
    throw new Error('User not found');
  }
  
  // Don't allow deleting other admins (safety measure)
  if (user.role === 'ADMIN') {
    throw new Error('Cannot delete admin users');
  }
  
  await prisma.user.delete({
    where: { id: userId }
  });
  
  return { message: 'User deleted successfully' };
}

/**
 * Get users with pagination and filtering
 */
async getUsersWithFilters(options = {}) {
  const {
    page = 1,
    limit = 10,
    role,
    status,
    search,
    sortBy = 'createdAt',
    sortOrder = 'desc'
  } = options;
  
  const skip = (page - 1) * limit;
  
  // Build where clause
  const where = {};
  
  if (role) {
    where.role = role;
  }
  
  if (status) {
    where.status = status;
  }
  
  if (search) {
    where.OR = [
      { firstName: { contains: search, mode: 'insensitive' } },
      { lastName: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      { phone: { contains: search, mode: 'insensitive' } }
    ];
  }
  
  // Get users with pagination
  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        fullName: true,
        phone: true,
        role: true,
        status: true,
        isEmailVerified: true,
        lastLogin: true,
        createdAt: true,
        updatedAt: true
      },
      skip,
      take: parseInt(limit),
      orderBy: { [sortBy]: sortOrder }
    }),
    prisma.user.count({ where })
  ]);
  
  return {
    users,
    pagination: {
      currentPage: parseInt(page),
      totalPages: Math.ceil(total / limit),
      totalUsers: total,
      hasNext: page * limit < total,
      hasPrev: page > 1
    }
  };
}

/**
 * Promote user to a new role (Admin only)
 */
async promoteUser(userId, newRole, promotedBy) {
  // Validate role
  const validRoles = ['CUSTOMER', 'MERCHANT', 'DRIVER', 'ADMIN'];
  if (!validRoles.includes(newRole)) {
    throw new Error('Invalid role specified');
  }
  
  // Get current user
  const user = await prisma.user.findUnique({
    where: { id: userId }
  });
  
  if (!user) {
    throw new Error('User not found');
  }
  
  if (user.role === newRole) {
    throw new Error(`User is already a ${newRole}`);
  }
  
  // Update user role and permissions
  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      role: newRole,
      permissions: this._getDefaultPermissions(newRole),
      updatedAt: new Date()
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      fullName: true,
      role: true,
      status: true,
      permissions: true,
      updatedAt: true
    }
  });
  
  // Log the promotion
  console.log(`User ${user.email} promoted from ${user.role} to ${newRole} by admin ${promotedBy}`);
  
  return updatedUser;
}

/**
 * Get users pending role promotion (customers who might need promotion)
 */
async getUsersPendingPromotion() {
  const pendingUsers = await prisma.user.findMany({
    where: {
      role: 'CUSTOMER',
      status: 'ACTIVE'
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      fullName: true,
      phone: true,
      role: true,
      status: true,
      createdAt: true
    },
    orderBy: {
      createdAt: 'desc'
    }
  });
  
  return pendingUsers;
}
/**
 * Get user statistics for admin dashboard
 */
async getUserStatistics() {
  // Get total counts by role
  const roleCounts = await prisma.user.groupBy({
    by: ['role'],
    _count: {
      role: true
    }
  });

  // Get status distribution
  const statusCounts = await prisma.user.groupBy({
    by: ['status'],
    _count: {
      status: true
    }
  });

  // Get email verification stats
  const emailStats = await prisma.user.groupBy({
    by: ['isEmailVerified'],
    _count: {
      isEmailVerified: true
    }
  });

  // Get recent registrations (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const recentRegistrations = await prisma.user.count({
    where: {
      createdAt: {
        gte: thirtyDaysAgo
      }
    }
  });

  // Get this week's registrations
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  
  const weeklyRegistrations = await prisma.user.count({
    where: {
      createdAt: {
        gte: oneWeekAgo
      }
    }
  });

  // Get total user count
  const totalUsers = await prisma.user.count();

  // Get recent users (last 5)
  const recentUsers = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      status: true,
      createdAt: true
    },
    orderBy: {
      createdAt: 'desc'
    },
    take: 5
  });

  // Format role counts
  const roleDistribution = {
    ADMIN: 0,
    MERCHANT: 0,
    DRIVER: 0,
    CUSTOMER: 0
  };
  
  roleCounts.forEach(item => {
    roleDistribution[item.role] = item._count.role;
  });

  // Format status counts
  const statusDistribution = {
    ACTIVE: 0,
    PENDING_VERIFICATION: 0,
    SUSPENDED: 0,
    INACTIVE: 0
  };
  
  statusCounts.forEach(item => {
    statusDistribution[item.status] = item._count.status;
  });

  // Format email verification stats
  const emailVerificationStats = {
    verified: 0,
    unverified: 0
  };
  
  emailStats.forEach(item => {
    if (item.isEmailVerified) {
      emailVerificationStats.verified = item._count.isEmailVerified;
    } else {
      emailVerificationStats.unverified = item._count.isEmailVerified;
    }
  });

  return {
    overview: {
      totalUsers,
      recentRegistrations: {
        lastMonth: recentRegistrations,
        lastWeek: weeklyRegistrations
      }
    },
    roleDistribution,
    statusDistribution,
    emailVerificationStats,
    recentUsers
  };
}

/**
 * Driver Commission Management
 */
async updateDriverCommission(driverId, commission) {
  // Validate driver exists and is actually a driver
  const driver = await prisma.user.findUnique({
    where: { id: driverId }
  });
  
  if (!driver) {
    throw new Error('Driver not found');
  }
  
  if (driver.role !== 'DRIVER') {
    throw new Error('User is not a driver');
  }
  
  // Validate commission range (20-100 EGP)
  if (commission < 20 || commission > 100) {
    throw new Error('Driver commission must be between 20 and 100 EGP');
  }
  
  const updatedDriver = await prisma.user.update({
    where: { id: driverId },
    data: { deliveryCommission: commission },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      deliveryCommission: true,
      updatedAt: true
    }
  });
  
  return updatedDriver;
}

async getDriverCommission(driverId) {
  const driver = await prisma.user.findUnique({
    where: { id: driverId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      deliveryCommission: true,
      role: true
    }
  });
  
  if (!driver) {
    throw new Error('Driver not found');
  }
  
  if (driver.role !== 'DRIVER') {
    throw new Error('User is not a driver');
  }
  
  return driver;
}

/**
 * Enhanced driver creation with commission
 */

async createDriver(userData) {
  const { deliveryCommission = 25, ...otherData } = userData;
  
  // Validate commission
  if (deliveryCommission < 20 || deliveryCommission > 100) {
    throw new Error('Driver commission must be between 20 and 100 EGP');
  }
  
  const driverData = {
    ...otherData,
    role: 'DRIVER',
    deliveryCommission,
    permissions: this._getDefaultPermissions('DRIVER'),
    status: 'ACTIVE',
    isEmailVerified: true,  // ← ADD THIS LINE
    verificationToken: null,
    verificationTokenExpires: null
  };
  
  return await this.register(driverData);
}


/**
 * Get user's current settlement
 */
async getUserCurrentSettlement(userId) {
  const settlement = await prisma.settlement.findFirst({
    where: {
      userId: userId,
      status: 'OPEN'
    },
    include: {
      settlementItems: {
        include: {
          order: {
            select: {
              orderNumber: true,
              productPrice: true,
              shippingFee: true,
              status: true
            }
          }
        }
      }
    }
  });
  
  return settlement;
}

/**
 * Get user's settlement history
 */
async getUserSettlementHistory(userId, options = {}) {
  const { page = 1, limit = 10 } = options;
  const skip = (page - 1) * limit;
  
  const [settlements, total] = await Promise.all([
    prisma.settlement.findMany({
      where: { userId },
      include: {
        settlementItems: {
          select: {
            itemAmount: true,
            orderNumber: true
          }
        }
      },
      skip,
      take: parseInt(limit),
      orderBy: { createdAt: 'desc' }
    }),
    prisma.settlement.count({ where: { userId } })
  ]);
  
  return {
    settlements,
    pagination: {
      currentPage: parseInt(page),
      totalPages: Math.ceil(total / limit),
      totalSettlements: total,
      hasNext: page * limit < total,
      hasPrev: page > 1
    }
  };
}

/**
 * Get driver performance stats
 */
async getDriverPerformanceStats(driverId) {
  const driver = await prisma.user.findUnique({
    where: { id: driverId }
  });
  
  if (!driver || driver.role !== 'DRIVER') {
    throw new Error('Driver not found');
  }
  
  // Get driver's orders statistics
  const orderStats = await prisma.order.groupBy({
    by: ['status'],
    where: { driverId },
    _count: { status: true }
  });
  
  // Get total earnings from settlements
  const earnings = await prisma.settlement.aggregate({
    where: {
      userId: driverId,
      status: 'CLOSED'
    },
    _sum: { amount: true }
  });
  
  // Format stats
  const stats = {
    totalDelivered: 0,
    totalReturned: 0,
    totalCancelled: 0,
    totalPartialDelivered: 0,
    totalEarnings: earnings._sum.amount || 0,
    deliveryCommission: driver.deliveryCommission || 0
  };
  
  orderStats.forEach(stat => {
    switch (stat.status) {
      case 'DELIVERED':
        stats.totalDelivered = stat._count.status;
        break;
      case 'RETURNED':
        stats.totalReturned = stat._count.status;
        break;
      case 'CANCELLED':
        stats.totalCancelled = stat._count.status;
        break;
      case 'PARTIALLY_DELIVERED':
        stats.totalPartialDelivered = stat._count.status;
        break;
    }
  });
  
  stats.successRate = stats.totalDelivered + stats.totalPartialDelivered > 0 
    ? ((stats.totalDelivered + stats.totalPartialDelivered) / (stats.totalDelivered + stats.totalReturned + stats.totalCancelled + stats.totalPartialDelivered) * 100).toFixed(2)
    : 0;
  
  return stats;
}

/**
 * Get all drivers with commission info
 */
async getAllDrivers() {
  const drivers = await prisma.user.findMany({
    where: { role: 'DRIVER' },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      fullName: true,
      email: true,
      phone: true,
      deliveryCommission: true,
      driverAvailability: true,
      licenseNumber: true,
      status: true,
      createdAt: true
    },
    orderBy: { createdAt: 'desc' }
  });
  
  return drivers;
}

async updateOutsourceCommission(userId, deliveryCommission, updatedBy) {
  try {
    // Verify user is outsource
    const user = await prisma.user.findFirst({
      where: {
        id: userId,
        role: 'OUTSOURCE',
        status: 'ACTIVE'
      }
    });

    if (!user) {
      throw new Error('Outsource partner not found or inactive');
    }

    // Validate commission range (10-200 EGP per order)
    if (deliveryCommission < 10 || deliveryCommission > 200) {
      throw new Error('Outsource commission must be between 10 and 200 EGP per order | عمولة الشريك الخارجي يجب أن تكون بين 10 و 200 جنيه لكل طلب');
    }

    // Update commission
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        deliveryCommission,
        updatedAt: new Date()
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        fullName: true,
        companyName: true,
        deliveryCommission: true,
        phone: true,
        email: true
      }
    });

    console.log(`✅ Outsource commission updated for ${updatedUser.companyName}: ${deliveryCommission} EGP`);
    return updatedUser;
  } catch (error) {
    console.error('❌ Error updating outsource commission:', error);
    throw error;
  }
}

// Get all outsource commissions
async getAllOutsourceCommissions() {
  try {
    const outsourcePartners = await prisma.user.findMany({
      where: {
        role: 'OUTSOURCE',
        status: 'ACTIVE',
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        fullName: true,
        companyName: true,
        phone: true,
        email: true,
        deliveryCommission: true,
        status: true,
        createdAt: true,
        _count: {
          select: {
            outsourceOrders: {
              where: {
                status: 'DELIVERED'
              }
            }
          }
        }
      },
      orderBy: {
        companyName: 'asc'
      }
    });

    return outsourcePartners.map(partner => ({
      id: partner.id,
      companyName: partner.companyName,
      fullName: partner.fullName,
      phone: partner.phone,
      email: partner.email,
      deliveryCommission: partner.deliveryCommission || 25, // Default if not set
      status: partner.status,
      totalDeliveredOrders: partner._count.outsourceOrders,
      createdAt: partner.createdAt
    }));
  } catch (error) {
    console.error('❌ Error getting outsource commissions:', error);
    throw new Error('Failed to retrieve outsource commissions');
  }
}

// More methods to be implemented:
// - verifyEmail
// - requestPasswordReset
// - resetPassword
// - updateUser
// - getUser
// - deleteUser
// - etc.
}

module.exports = new UserService();