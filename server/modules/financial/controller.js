const FinancialService = require('./service');
const { PrismaClient } = require('@prisma/client');  // ADD THIS LINE
const prisma = new PrismaClient();                    // ADD THIS LINE

class FinancialController {
  // Process delivered orders to create financial transactions
  async processDeliveredOrders(req, res) {
    try {
      const result = await FinancialService.processDeliveredOrders();

      res.status(200).json({
        success: true,
        message: 'Delivered orders processed successfully',
        messageAr: 'تم معالجة الطلبات المسلمة بنجاح',
        data: result
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to process delivered orders'
      });
    }
  }

  // Get all financial transactions
  async getAllTransactions(req, res) {
    try {
      const options = {
        page: req.query.page,
        limit: req.query.limit,
        merchantId: req.query.merchantId,
        type: req.query.type,
        status: req.query.status,
        sortBy: req.query.sortBy,
        sortOrder: req.query.sortOrder
      };

      const result = await FinancialService.getAllTransactions(options);

      res.status(200).json({
        success: true,
        message: 'Financial transactions retrieved successfully',
        messageAr: 'تم استرجاع المعاملات المالية بنجاح',
        data: result.transactions,
        pagination: result.pagination
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get financial transactions'
      });
    }
  }

  // Get financial transaction by ID
  async getTransactionById(req, res) {
    try {
      const transaction = await FinancialService.getTransactionById(req.params.id);

      res.status(200).json({
        success: true,
        message: 'Financial transaction retrieved successfully',
        messageAr: 'تم استرجاع المعاملة المالية بنجاح',
        data: transaction
      });
    } catch (error) {
      const statusCode = error.message === 'Transaction not found' ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Failed to get financial transaction'
      });
    }
  }

  // Get all merchant balances (Admin only)
  async getAllMerchantBalances(req, res) {
    try {
      const balances = await FinancialService.getAllMerchantBalances();

      res.status(200).json({
        success: true,
        message: 'Merchant balances retrieved successfully',
        messageAr: 'تم استرجاع أرصدة التجار بنجاح',
        data: balances
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get merchant balances'
      });
    }
  }

  // Get specific merchant balance (Admin)
  async getMerchantBalance(req, res) {
    try {
      const balance = await FinancialService.getMerchantBalance(req.params.merchantId);

      res.status(200).json({
        success: true,
        message: 'Merchant balance retrieved successfully',
        messageAr: 'تم استرجاع رصيد التاجر بنجاح',
        data: balance
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get merchant balance'
      });
    }
  }

  // Get my balance (Merchant only)
  async getMyBalance(req, res) {
    try {
      const balance = await FinancialService.getMerchantBalance(req.user.id);

      res.status(200).json({
        success: true,
        message: 'Your balance retrieved successfully',
        messageAr: 'تم استرجاع رصيدك بنجاح',
        data: balance
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get your balance'
      });
    }
  }

  // Update merchant balance (recalculate)
  async updateMerchantBalance(req, res) {
    try {
      const merchantId = req.params.merchantId || req.user.id;
      const balance = await FinancialService.updateMerchantBalance(merchantId);

      res.status(200).json({
        success: true,
        message: 'Merchant balance updated successfully',
        messageAr: 'تم تحديث رصيد التاجر بنجاح',
        data: balance
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to update merchant balance'
      });
    }
  }

  // Create settlement for merchant
  async createSettlement(req, res) {
    try {
      const { merchantId, userType, amount, paymentMethod, notes } = req.body;
      
      const settlement = await FinancialService.createSettlement(
        merchantId,
        userType || 'MERCHANT',  // Default to MERCHANT for backward compatibility
        parseFloat(amount),
        paymentMethod,
        req.user.id,
        notes
      );

      res.status(201).json({
        success: true,
        message: 'Settlement created successfully',
        messageAr: 'تم إنشاء التسوية بنجاح',
        data: settlement
      });
    } catch (error) {
      const statusCode = error.message.includes('No pending transactions') ? 400 : 500;
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Failed to create settlement'
      });
    }
  }

  // Settle specific merchant (shortcut endpoint)
  async settleMerchant(req, res) {
    try {
      const { paymentMethod, notes } = req.body;
      const merchantId = req.params.merchantId;

      // Get merchant balance to determine settlement amount
      const balance = await FinancialService.getMerchantBalance(merchantId);
      
      if (balance.netBalance <= 0) {
        return res.status(400).json({
          success: false,
          message: 'No amount owed to this merchant',
          messageAr: 'لا يوجد مبلغ مستحق لهذا التاجر'
        });
      }

      const settlement = await FinancialService.createSettlement(
        merchantId,
        balance.netBalance,
        paymentMethod,
        req.user.id,
        notes
      );

      res.status(201).json({
        success: true,
        message: 'Merchant settled successfully',
        messageAr: 'تم تسوية التاجر بنجاح',
        data: settlement
      });
    } catch (error) {
      const statusCode = error.message.includes('No pending transactions') ? 400 : 500;
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Failed to settle merchant'
      });
    }
  }

  // Get all settlements
  async getAllSettlements(req, res) {
    try {
      const options = {
        page: req.query.page,
        limit: req.query.limit,
        merchantId: req.query.merchantId,
        sortBy: req.query.sortBy,
        sortOrder: req.query.sortOrder
      };

      const result = await FinancialService.getAllSettlements(options);

      res.status(200).json({
        success: true,
        message: 'Settlements retrieved successfully',
        messageAr: 'تم استرجاع التسويات بنجاح',
        data: result.settlements,
        pagination: result.pagination
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get settlements'
      });
    }
  }

  // Get settlement by ID
  async getSettlementById(req, res) {
    try {
      const settlement = await FinancialService.getSettlementById(req.params.id);

      res.status(200).json({
        success: true,
        message: 'Settlement retrieved successfully',
        messageAr: 'تم استرجاع التسوية بنجاح',
        data: settlement
      });
    } catch (error) {
      const statusCode = error.message === 'Settlement not found' ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Failed to get settlement'
      });
    }
  }

  // Get my settlements (Merchant only)
  async getMySettlements(req, res) {
    try {
      const options = {
        page: req.query.page,
        limit: req.query.limit,
        merchantId: req.user.id,
        sortBy: req.query.sortBy,
        sortOrder: req.query.sortOrder
      };

      const result = await FinancialService.getAllSettlements(options);

      res.status(200).json({
        success: true,
        message: 'Your settlements retrieved successfully',
        messageAr: 'تم استرجاع تسوياتك بنجاح',
        data: result.settlements,
        pagination: result.pagination
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get your settlements'
      });
    }
  }

  // Get my transactions (Merchant only)
  async getMyTransactions(req, res) {
    try {
      const options = {
        page: req.query.page,
        limit: req.query.limit,
        merchantId: req.user.id,
        type: req.query.type,
        status: req.query.status,
        sortBy: req.query.sortBy,
        sortOrder: req.query.sortOrder
      };

      const result = await FinancialService.getAllTransactions(options);

      res.status(200).json({
        success: true,
        message: 'Your transactions retrieved successfully',
        messageAr: 'تم استرجاع معاملاتك المالية بنجاح',
        data: result.transactions,
        pagination: result.pagination
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get your transactions'
      });
    }
  }

  // Get financial statistics (Admin only)
  async getFinancialStatistics(req, res) {
    try {
      const statistics = await FinancialService.getFinancialStatistics();

      res.status(200).json({
        success: true,
        message: 'Financial statistics retrieved successfully',
        messageAr: 'تم استرجاع الإحصائيات المالية بنجاح',
        data: statistics
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get financial statistics'
      });
    }
  }

  // Get driver earnings (Admin only)
  async getDriverEarnings(req, res) {
    try {
      const options = {
        startDate: req.query.startDate,
        endDate: req.query.endDate,
        driverId: req.query.driverId
      };

      const earnings = await FinancialService.getDriverEarnings(options);

      res.status(200).json({
        success: true,
        message: 'Driver earnings retrieved successfully',
        messageAr: 'تم استرجاع أرباح السائقين بنجاح',
        data: earnings
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get driver earnings'
      });
    }
  }

  // Get merchant financial statement
  async getMerchantStatement(req, res) {
    try {
      const merchantId = req.params.merchantId;
      
      // Get merchant balance
      const balance = await FinancialService.getMerchantBalance(merchantId);
      
      // Get merchant transactions
      const transactionsResult = await FinancialService.getAllTransactions({
        merchantId,
        limit: 100,
        sortBy: 'createdAt',
        sortOrder: 'desc'
      });

      // Get merchant settlements
      const settlementsResult = await FinancialService.getAllSettlements({
        merchantId,
        limit: 50,
        sortBy: 'settledAt',
        sortOrder: 'desc'
      });

      const statement = {
        merchant: balance.merchant,
        balance,
        recentTransactions: transactionsResult.transactions,
        recentSettlements: settlementsResult.settlements,
        generatedAt: new Date()
      };

      res.status(200).json({
        success: true,
        message: 'Merchant statement retrieved successfully',
        messageAr: 'تم استرجاع كشف حساب التاجر بنجاح',
        data: statement
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get merchant statement'
      });
    }
  }

  // Get my statement (Merchant only)
  async getMyStatement(req, res) {
    try {
      // Get my balance
      const balance = await FinancialService.getMerchantBalance(req.user.id);
      
      // Get my transactions
      const transactionsResult = await FinancialService.getAllTransactions({
        merchantId: req.user.id,
        limit: 100,
        sortBy: 'createdAt',
        sortOrder: 'desc'
      });

      // Get my settlements
      const settlementsResult = await FinancialService.getAllSettlements({
        merchantId: req.user.id,
        limit: 50,
        sortBy: 'settledAt',
        sortOrder: 'desc'
      });

      const statement = {
        merchant: balance.merchant,
        balance,
        recentTransactions: transactionsResult.transactions,
        recentSettlements: settlementsResult.settlements,
        generatedAt: new Date()
      };

      res.status(200).json({
        success: true,
        message: 'Your statement retrieved successfully',
        messageAr: 'تم استرجاع كشف حسابك بنجاح',
        data: statement
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get your statement'
      });
    }
  }

  // Manual transaction creation (Admin only)
  async createManualTransaction(req, res) {
    try {
      const { orderId, merchantId, type, amount, description, descriptionAr } = req.body;

      // If orderId provided, create transaction for specific order
      if (orderId) {
        const order = await prisma.order.findUnique({
          where: { id: orderId }
        });

        if (!order) {
          return res.status(404).json({
            success: false,
            message: 'Order not found'
          });
        }

        const transaction = await FinancialService.createOrderTransaction(order);
        
        // Update merchant balance
        await FinancialService.updateMerchantBalance(order.merchantId);

        return res.status(201).json({
          success: true,
          message: 'Transaction created successfully',
          messageAr: 'تم إنشاء المعاملة بنجاح',
          data: transaction
        });
      }

      // Create manual transaction (for adjustments, refunds, etc.)
      const transactionNumber = await FinancialService.generateTransactionNumber();
      
      const transaction = await prisma.financialTransaction.create({
        data: {
          transactionNumber,
          merchantId,
          type,
          amount: parseFloat(amount),
          currency: 'EGP',
          description,
          descriptionAr,
          status: 'PENDING'
        },
        include: {
          merchant: {
            select: {
              firstName: true,
              lastName: true,
              fullName: true,
              companyName: true
            }
          }
        }
      });

      // Update merchant balance
      await FinancialService.updateMerchantBalance(merchantId);

      res.status(201).json({
        success: true,
        message: 'Manual transaction created successfully',
        messageAr: 'تم إنشاء المعاملة اليدوية بنجاح',
        data: transaction
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to create manual transaction'
      });
    }
  }

  // Get all driver balances (Admin only)
async getAllDriverBalances(req, res) {
  try {
    const drivers = await prisma.user.findMany({
      where: { role: 'DRIVER' },
      select: { id: true, firstName: true, lastName: true, fullName: true }
    });

    const driverBalances = await Promise.all(
      drivers.map(async (driver) => {
        const balance = await FinancialService.getUserBalance(driver.id, 'DRIVER');
        return {
          ...driver,
          ...balance
        };
      })
    );

    res.status(200).json({
      success: true,
      message: 'Driver balances retrieved successfully',
      messageAr: 'تم استرجاع أرصدة السائقين بنجاح',
      data: driverBalances
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get driver balances'
    });
  }
}

// Create driver settlement
async createDriverSettlement(req, res) {
  try {
    const { driverId, amount, paymentMethod, notes } = req.body;
    
    const settlement = await FinancialService.createSettlement(
      driverId,
      'DRIVER',
      parseFloat(amount),
      paymentMethod,
      req.user.id,
      notes
    );

    res.status(201).json({
      success: true,
      message: 'Driver settlement created successfully',
      messageAr: 'تم إنشاء تسوية السائق بنجاح',
      data: settlement
    });
  } catch (error) {
    const statusCode = error.message.includes('No pending transactions') ? 400 : 500;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to create driver settlement'
    });
  }
}

// Get driver earnings (Admin or specific driver)
async getDriverEarnings(req, res) {
  try {
    const { startDate, endDate, driverId } = req.query;
    
    const earnings = await FinancialService.getDriverEarnings({
      startDate,
      endDate,
      driverId
    });

    res.status(200).json({
      success: true,
      message: 'Driver earnings retrieved successfully',
      messageAr: 'تم استرجاع أرباح السائقين بنجاح',
      data: earnings
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get driver earnings'
    });
  }
}

// Get driver balance by ID
async getDriverBalance(req, res) {
  try {
    const { driverId } = req.params;
    
    const balance = await FinancialService.getUserBalance(driverId, 'DRIVER');

    res.status(200).json({
      success: true,
      message: 'Driver balance retrieved successfully',
      messageAr: 'تم استرجاع رصيد السائق بنجاح',
      data: balance
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get driver balance'
    });
  }
}
}

module.exports = new FinancialController();