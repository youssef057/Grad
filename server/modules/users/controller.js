const userService = require('./service');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class UserController {
  /**
   * Register a new user
   * @route POST /api/users/register
   * @access Public
   */
  async register(req, res) {
    try {
      const userData = req.body;
      const user = await userService.register(userData);
      
      res.status(201).json({
        success: true,
        data: user,
        message: 'User registered successfully. Please verify your email.'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message || 'Registration failed'
      });
    }
  }
  
  /**
   * Login user
   * @route POST /api/users/login
   * @access Public
   */
  async login(req, res) {
    try {
      const { email, password } = req.body;
      const data = await userService.login(email, password);
      
      res.status(200).json({
        success: true,
        data,
        message: 'Login successful'
      });
    } catch (error) {
      res.status(401).json({
        success: false,
        message: error.message || 'Invalid credentials'
      });
    }
  }
  
  /**
   * Get current user profile
   * @route GET /api/users/me
   * @access Private
   */
  async getProfile(req, res) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
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
          lastLogin: true,
          createdAt: true,
          permissions: true
        }
      });
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }
      
      res.status(200).json({
        success: true,
        data: user
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message || 'Server error'
      });
    }
  }
  
  /**
   * Get all users (admin only)
   * @route GET /api/users
   * @access Private/Admin
   */
  async getAllUsers(req, res) {
    try {
      const users = await prisma.user.findMany({
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
          createdAt: true
        }
      });
      
      res.status(200).json({
        success: true,
        count: users.length,
        data: users
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message || 'Server error'
      });
    }
  }
  
  /**
   * Update user profile
   * @route PUT /api/users/me
   * @access Private
   */
  async updateProfile(req, res) {
    try {
      const { firstName, lastName, phone, address, city, state, country, postalCode } = req.body;
      
      const updatedUser = await prisma.user.update({
        where: { id: req.user.id },
        data: {
          firstName: firstName || undefined,
          lastName: lastName || undefined,
          fullName: firstName && lastName ? `${firstName} ${lastName}` : undefined,
          phone: phone || undefined,
          address: address || undefined,
          city: city || undefined,
          state: state || undefined,
          country: country || undefined,
          postalCode: postalCode || undefined
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
          isEmailVerified: true,
          address: true,
          city: true,
          state: true,
          country: true,
          postalCode: true,
          createdAt: true,
          updatedAt: true
        }
      });
      
      res.status(200).json({
        success: true,
        data: updatedUser,
        message: 'Profile updated successfully'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message || 'Update failed'
      });
    }
  }

  // Add this method to your UserController class:

/**
 * Verify user email
 * @route GET /api/users/verify-email/:token
 * @access Public
 */
async verifyEmail(req, res) {
  try {
    const { token } = req.params;
    
    // Verify token
    await userService.verifyEmail(token);
    
    res.status(200).json({
      success: true,
      message: 'Email verified successfully. You can now log in.'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || 'Email verification failed'
    });
  }
}
/**
 * Resend verification email
 * @route POST /api/users/resend-verification
 * @access Public
 */
async resendVerification(req, res) {
  try {
    const { email } = req.body;
    
    // Find user
    const user = await prisma.user.findUnique({
      where: { email }
    });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    if (user.isEmailVerified) {
      return res.status(400).json({
        success: false,
        message: 'Email is already verified'
      });
    }
    
    // Resend verification email
    await userService.sendVerificationEmail(user);
    
    res.status(200).json({
      success: true,
      message: 'Verification email sent successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to send verification email'
    });
  }
}
/**
 * Request password reset
 * @route POST /api/users/forgot-password
 * @access Public
 */
async forgotPassword(req, res) {
  try {
    const { email } = req.body;
    
    const result = await userService.requestPasswordReset(email);
    
    res.status(200).json({
      success: true,
      message: result.message
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to send password reset email'
    });
  }
}

/**
 * Reset password
 * @route POST /api/users/reset-password
 * @access Public
 */
async resetPassword(req, res) {
  try {
    const { token, password } = req.body;
    
    const result = await userService.resetPassword(token, password);
    
    res.status(200).json({
      success: true,
      message: result.message
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || 'Password reset failed'
    });
  }
}

/**
 * Get user by ID (Admin only)
 * @route GET /api/users/:id
 * @access Private/Admin
 */
async getUserById(req, res) {
  try {
    const { id } = req.params;
    const user = await userService.getUserById(id);
    
    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      message: error.message || 'User not found'
    });
  }
}

/**
 * Update user by admin
 * @route PUT /api/users/:id
 * @access Private/Admin
 */
async updateUserByAdmin(req, res) {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    const updatedUser = await userService.updateUserByAdmin(id, updateData);
    
    res.status(200).json({
      success: true,
      data: updatedUser,
      message: 'User updated successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to update user'
    });
  }
}

/**
 * Delete user (Admin only)
 * @route DELETE /api/users/:id
 * @access Private/Admin
 */
async deleteUser(req, res) {
  try {
    const { id } = req.params;
    const result = await userService.deleteUser(id);
    
    res.status(200).json({
      success: true,
      message: result.message
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to delete user'
    });
  }
}

/**
 * Get users with advanced filtering and pagination
 * @route GET /api/users/search
 * @access Private/Admin
 */
async searchUsers(req, res) {
  try {
    const options = {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 10,
      role: req.query.role,
      status: req.query.status,
      search: req.query.search,
      sortBy: req.query.sortBy || 'createdAt',
      sortOrder: req.query.sortOrder || 'desc'
    };
    
    const result = await userService.getUsersWithFilters(options);
    
    res.status(200).json({
      success: true,
      data: result.users,
      pagination: result.pagination
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to search users'
    });
  }
}

 /**
 * Promote user role (Admin only)
 * @route PUT /api/users/:id/promote
 * @access Private/Admin
 */
async promoteUser(req, res) {
  try {
    const { id } = req.params;
    const { role } = req.body;
    
    const updatedUser = await userService.promoteUser(id, role, req.user.email);
    
    res.status(200).json({
      success: true,
      data: updatedUser,
      message: `User promoted to ${role} successfully`
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to promote user'
    });
  }
}

/**
 * Get users pending promotion (Admin only)
 * @route GET /api/users/pending-promotion
 * @access Private/Admin
 */
async getPendingPromotions(req, res) {
  try {
    const pendingUsers = await userService.getUsersPendingPromotion();
    
    res.status(200).json({
      success: true,
      data: pendingUsers,
      message: 'Pending promotions retrieved successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get pending promotions'
    });
  }
}

/**
 * Get user statistics (Admin only)
 * @route GET /api/users/statistics
 * @access Private/Admin
 */
async getUserStatistics(req, res) {
  try {
    const statistics = await userService.getUserStatistics();
    
    res.status(200).json({
      success: true,
      data: statistics,
      message: 'User statistics retrieved successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get user statistics'
    });
  }
}

/**
 * Update driver commission (Admin only)
 * @route PUT /api/users/drivers/:id/commission
 * @access Private/Admin
 */
async updateDriverCommission(req, res) {
  try {
    const { id } = req.params;
    const { commission } = req.body;
    
    const updatedDriver = await userService.updateDriverCommission(id, commission);
    
    res.status(200).json({
      success: true,
      data: updatedDriver,
      message: `Driver commission updated to ${commission} EGP`
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to update driver commission'
    });
  }
}

/**
 * Get driver commission
 * @route GET /api/users/drivers/:id/commission
 * @access Private/Admin
 */
async getDriverCommission(req, res) {
  try {
    const { id } = req.params;
    const driver = await userService.getDriverCommission(id);
    
    res.status(200).json({
      success: true,
      data: driver
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      message: error.message || 'Driver not found'
    });
  }
}

/**
 * Create new driver with commission
 * @route POST /api/users/drivers
 * @access Private/Admin
 */
async createDriver(req, res) {
  try {
    const driverData = req.body;
    const driver = await userService.createDriver(driverData);
    
    res.status(201).json({
      success: true,
      data: driver,
      message: 'Driver created successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to create driver'
    });
  }
}

/**
 * Get current user's settlement
 * @route GET /api/users/my-settlement
 * @access Private
 */
async getCurrentSettlement(req, res) {
  try {
    const settlement = await userService.getUserCurrentSettlement(req.user.id);
    
    res.status(200).json({
      success: true,
      data: settlement,
      message: settlement ? 'Current settlement found' : 'No open settlement found'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get current settlement'
    });
  }
}

/**
 * Get user's settlement history
 * @route GET /api/users/settlement-history
 * @access Private
 */
async getSettlementHistory(req, res) {
  try {
    const options = {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 10
    };
    
    const result = await userService.getUserSettlementHistory(req.user.id, options);
    
    res.status(200).json({
      success: true,
      data: result.settlements,
      pagination: result.pagination
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get settlement history'
    });
  }
}

/**
 * Get driver performance statistics
 * @route GET /api/users/drivers/:id/performance
 * @access Private/Admin
 */
async getDriverPerformance(req, res) {
  try {
    const { id } = req.params;
    const stats = await userService.getDriverPerformanceStats(id);
    
    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      message: error.message || 'Driver not found'
    });
  }
}

/**
 * Get all drivers with commission info
 * @route GET /api/users/drivers
 * @access Private/Admin
 */
async getAllDrivers(req, res) {
  try {
    const drivers = await userService.getAllDrivers();
    
    res.status(200).json({
      success: true,
      count: drivers.length,
      data: drivers
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get drivers'
    });
  }
}

// Update outsource commission
async updateOutsourceCommission(req, res) {
  try {
    const { userId } = req.params;
    const { deliveryCommission } = req.body;
    
    const updatedUser = await userService.updateOutsourceCommission(
      userId, 
      deliveryCommission, 
      req.user.id
    );
    
    res.status(200).json({
      success: true,
      message: 'Outsource commission updated successfully',
      messageAr: 'تم تحديث عمولة الشريك الخارجي بنجاح',
      data: {
        userId: updatedUser.id,
        companyName: updatedUser.companyName,
        fullName: updatedUser.fullName,
        deliveryCommission: updatedUser.deliveryCommission
      }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to update outsource commission'
    });
  }
}

// Get all outsource commissions
async getAllOutsourceCommissions(req, res) {
  try {
    const outsourcePartners = await userService.getAllOutsourceCommissions();
    
    res.status(200).json({
      success: true,
      message: 'Outsource commissions retrieved successfully',
      messageAr: 'تم استرجاع عمولات الشركاء الخارجيين بنجاح',
      data: {
        outsourcePartners,
        totalPartners: outsourcePartners.length
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get outsource commissions'
    });
  }
}

} // ← This closes the UserController class

module.exports = new UserController();