const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class FinancialService {
  // Auto-generate transaction number (following Order pattern)
  async generateTransactionNumber() {
    try {
      const lastTransaction = await prisma.financialTransaction.findFirst({
        orderBy: { transactionNumber: 'desc' },
        select: { transactionNumber: true }
      });

      if (!lastTransaction) {
        return 'TXN-001';
      }

      // Extract number from TXN-XXX format
      const lastNumber = parseInt(lastTransaction.transactionNumber.split('-')[1]);
      const nextNumber = (lastNumber + 1).toString().padStart(3, '0');
      return `TXN-${nextNumber}`;
    } catch (error) {
      console.error('Error generating transaction number:', error);
      throw new Error('Failed to generate transaction number');
    }
  }

  // Auto-generate settlement number
  async generateSettlementNumber() {
    try {
      const lastSettlement = await prisma.settlement.findFirst({
        orderBy: { settlementNumber: 'desc' },
        select: { settlementNumber: true }
      });

      if (!lastSettlement) {
        return 'SETT-001';
      }

      const lastNumber = parseInt(lastSettlement.settlementNumber.split('-')[1]);
      const nextNumber = (lastNumber + 1).toString().padStart(3, '0');
      return `SETT-${nextNumber}`;
    } catch (error) {
      console.error('Error generating settlement number:', error);
      throw new Error('Failed to generate settlement number');
    }
  }

  // Process delivered orders and create financial transactions
  async processDeliveredOrders() {
    try {
      const deliveredOrders = await prisma.order.findMany({
        where: {
          status: 'DELIVERED',
          OR: [
            { addedToMerchantSettlement: false },
            { addedToDriverSettlement: false },
            { addedToOutsourceSettlement: false }  // ADD OUTSOURCE SUPPORT
          ]
        },
        include: {
          merchant: true,
          driver: true,
          outsource: true,  // ADD OUTSOURCE INCLUDE
          vehicle: true
        }
      });

      let processedOrders = 0;
      const transactions = [];

      for (const order of deliveredOrders) {
        // 1. Process merchant transaction
        if (!order.addedToMerchantSettlement && order.paymentMethod === 'COD') {
          const merchantTransaction = await this.processOrderFinancial(order);
          transactions.push(merchantTransaction);
          
          await prisma.order.update({
            where: { id: order.id },
            data: { addedToMerchantSettlement: true }
          });
        }

        // 2. Process driver transaction
        if (!order.addedToDriverSettlement && order.driverId) {
          const driverTransaction = await this.createDriverTransaction(order);
          transactions.push(driverTransaction);
          
          await prisma.order.update({
            where: { id: order.id },
            data: { addedToDriverSettlement: true }
          });
          
          processedOrders++;
        }

        // 3. Process outsource transaction - NEW SECTION
        if (!order.addedToOutsourceSettlement && order.outsourceId) {
          const outsourceTransaction = await this.createOutsourceTransaction(order);
          transactions.push(outsourceTransaction);
          
          await prisma.order.update({
            where: { id: order.id },
            data: { addedToOutsourceSettlement: true }
          });
          
          processedOrders++;
        }
      }

      console.log(`✅ Processed ${processedOrders} orders for driver/outsource commissions`);
      
      return {
        processedOrders,
        transactions
      };

    } catch (error) {
      console.error('❌ Error processing delivered orders:', error);
      throw error;
    }
  }

  // Create financial transaction for specific order
  async createOrderTransaction(order) {
    try {
      const transactionNumber = await this.generateTransactionNumber();
      
      let transactionData;

      if (order.paymentMethod === 'PREPAID') {
        transactionData = {
          transactionNumber,
          orderId: order.id,
          userId: order.merchantId,
          userType: 'MERCHANT',
          type: 'DELIVERY_FEE_OWED',
          amount: order.shippingFee,
          currency: 'EGP',
          description: `Delivery fee for PREPAID order ${order.orderNumber}`,
          descriptionAr: `رسوم توصيل للطلب المدفوع مسبقاً ${order.orderNumber}`,
          status: 'PENDING'
        };
      } else if (order.paymentMethod === 'COD') {
        transactionData = {
          transactionNumber,
          orderId: order.id,
          userId: order.merchantId,
          userType: 'MERCHANT',
          type: 'PRODUCT_PAYMENT_OWED',
          amount: order.productPrice,
          currency: 'EGP',
          description: `Product payment for COD order ${order.orderNumber}`,
          descriptionAr: `دفع المنتج للطلب الدفع عند الاستلام ${order.orderNumber}`,
          status: 'PENDING'
        };
      }

      const transaction = await prisma.financialTransaction.create({
        data: transactionData,
        include: {
          order: {
            select: {
              orderNumber: true,
              customerName: true,
              paymentMethod: true
            }
          },
          user: {
            select: {
              firstName: true,
              lastName: true,
              fullName: true,
              companyName: true
            }
          }
        }
      });

      return transaction;
    } catch (error) {
      console.error('Error creating order transaction:', error);
      throw new Error('Failed to create financial transaction');
    }
  }

  // Create driver commission transaction
  async createDriverTransaction(order) {
    try {
      const driver = await prisma.user.findUnique({
        where: { id: order.driverId },
        select: { deliveryCommission: true, firstName: true, lastName: true }
      });

      if (!driver || !driver.deliveryCommission) {
        throw new Error('Driver commission not found');
      }

      const transactionNumber = await this.generateTransactionNumber();

      const transaction = await prisma.financialTransaction.create({
        data: {
          transactionNumber,
          orderId: order.id,
          userId: order.driverId,
          userType: 'DRIVER',
          type: 'COMMISSION',
          amount: driver.deliveryCommission,
          currency: 'EGP',
          description: `Driver commission for order ${order.orderNumber}`,
          descriptionAr: `عمولة السائق للطلب ${order.orderNumber}`,
          status: 'PENDING'
        },
        include: {
          order: {
            select: {
              orderNumber: true,
              customerName: true,
              paymentMethod: true
            }
          },
          user: {
            select: {
              firstName: true,
              lastName: true,
              fullName: true
            }
          }
        }
      });

      console.log(`✅ Driver transaction created: ${transactionNumber} - ${driver.deliveryCommission} EGP`);
      return transaction;

    } catch (error) {
      console.error('❌ Error creating driver transaction:', error);
      throw error;
    }
  }

  // Create outsource commission transaction - NEW METHOD
  async createOutsourceTransaction(order) {
    try {
      const outsource = await prisma.user.findUnique({
        where: { id: order.outsourceId },
        select: { 
          deliveryCommission: true, 
          firstName: true, 
          lastName: true,
          companyName: true 
        }
      });

      if (!outsource) {
        throw new Error('Outsource partner not found');
      }

      // Use the commission amount stored in the order (fixed price per order)
      const commissionAmount = order.outsourceCommissionAmount || outsource.deliveryCommission || 25.0;

      const transactionNumber = await this.generateTransactionNumber();

      const transaction = await prisma.financialTransaction.create({
        data: {
          transactionNumber,
          orderId: order.id,
          userId: order.outsourceId,
          userType: 'OUTSOURCE',
          type: 'COMMISSION',
          amount: commissionAmount,
          currency: 'EGP',
          description: `Outsource commission for order ${order.orderNumber}`,
          descriptionAr: `عمولة الشريك الخارجي للطلب ${order.orderNumber}`,
          status: 'PENDING'
        },
        include: {
          order: {
            select: {
              orderNumber: true,
              customerName: true,
              paymentMethod: true
            }
          },
          user: {
            select: {
              firstName: true,
              lastName: true,
              fullName: true,
              companyName: true
            }
          }
        }
      });

      console.log(`✅ Outsource transaction created: ${transactionNumber} - ${commissionAmount} EGP`);
      return transaction;

    } catch (error) {
      console.error('❌ Error creating outsource transaction:', error);
      throw error;
    }
  }

  // Process order financial (wrapper method)
  async processOrderFinancial(order) {
    try {
      const transaction = await this.createOrderTransaction(order);
      await this.updateMerchantBalance(order.merchantId);
      return transaction;
    } catch (error) {
      console.error('Error processing order financial:', error);
      throw error;
    }
  }

  // Get all financial transactions with filtering
  async getAllTransactions(options = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        merchantId,
        userId,
        userType,
        type,
        status,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = options;

      const skip = (page - 1) * limit;
      const where = { isActive: true };

      // Support both old merchantId and new userId filtering
      if (merchantId) {
        where.OR = [
          { userId: merchantId, userType: 'MERCHANT' },
          { merchantId: merchantId }
        ];
      }
      if (userId) where.userId = userId;
      if (userType) where.userType = userType;
      if (type) where.type = type;
      if (status) where.status = status;

      const [transactions, totalCount] = await Promise.all([
        prisma.financialTransaction.findMany({
          where,
          skip,
          take: parseInt(limit),
          orderBy: { [sortBy]: sortOrder },
          include: {
            order: {
              select: {
                orderNumber: true,
                customerName: true,
                paymentMethod: true,
                deliveredAt: true
              }
            },
            user: {
              select: {
                firstName: true,
                lastName: true,
                fullName: true,
                companyName: true
              }
            },
            settlement: {
              select: {
                settlementNumber: true,
                amount: true,
                settledAt: true
              }
            }
          }
        }),
        prisma.financialTransaction.count({ where })
      ]);

      return {
        transactions,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalCount / limit),
          totalTransactions: totalCount,
          hasNext: page * limit < totalCount,
          hasPrev: page > 1
        }
      };
    } catch (error) {
      console.error('Error getting transactions:', error);
      throw new Error('Failed to retrieve transactions');
    }
  }

  // Get specific transaction by ID
  async getTransactionById(transactionId) {
    try {
      const transaction = await prisma.financialTransaction.findFirst({
        where: {
          id: transactionId,
          isActive: true
        },
        include: {
          order: {
            select: {
              orderNumber: true,
              customerName: true,
              customerPhone: true,
              deliveryAddress: true,
              packageDescription: true,
              productPrice: true,
              shippingFee: true,
              paymentMethod: true,
              status: true,
              deliveredAt: true
            }
          },
          user: {
            select: {
              firstName: true,
              lastName: true,
              fullName: true,
              email: true,
              phone: true,
              companyName: true
            }
          },
          settlement: {
            select: {
              settlementNumber: true,
              amount: true,
              paymentMethod: true,
              settledAt: true,
              settledBy: true
            }
          }
        }
      });

      if (!transaction) {
        throw new Error('Transaction not found');
      }

      return transaction;
    } catch (error) {
      console.error('Error getting transaction:', error);
      throw error.message === 'Transaction not found' ? error : new Error('Failed to get transaction');
    }
  }

  // Update merchant balance
  async updateMerchantBalance(merchantId) {
    try {
      const owedToMerchant = await prisma.financialTransaction.aggregate({
        where: {
          userId: merchantId,
          userType: 'MERCHANT',
          type: 'PRODUCT_PAYMENT_OWED',
          status: 'PENDING',
          isActive: true
        },
        _sum: { amount: true }
      });

      const owedByMerchant = await prisma.financialTransaction.aggregate({
        where: {
          userId: merchantId,
          userType: 'MERCHANT',
          type: 'DELIVERY_FEE_OWED', 
          status: 'PENDING',
          isActive: true
        },
        _sum: { amount: true }
      });

      const totalOwedToMerchant = owedToMerchant._sum.amount || 0;
      const totalOwedByMerchant = owedByMerchant._sum.amount || 0;
      const netBalance = totalOwedToMerchant - totalOwedByMerchant;

      const balance = await prisma.merchantBalance.upsert({
        where: { merchantId },
        update: {
          totalOwedToMerchant,
          totalOwedByMerchant,
          netBalance,
          lastUpdated: new Date()
        },
        create: {
          merchantId,
          totalOwedToMerchant,
          totalOwedByMerchant,
          netBalance,
          lastUpdated: new Date()
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

      return balance;
    } catch (error) {
      console.error('Error updating merchant balance:', error);
      throw new Error('Failed to update merchant balance');
    }
  }

  // Get merchant balance
  async getMerchantBalance(merchantId) {
    try {
      let balance = await prisma.merchantBalance.findUnique({
        where: { merchantId },
        include: {
          merchant: {
            select: {
              firstName: true,
              lastName: true,
              fullName: true,
              email: true,
              companyName: true
            }
          }
        }
      });

      if (!balance) {
        balance = await this.updateMerchantBalance(merchantId);
      }

      return balance;
    } catch (error) {
      console.error('Error getting merchant balance:', error);
      throw new Error('Failed to get merchant balance');
    }
  }

  // Get all merchant balances
  async getAllMerchantBalances() {
    try {
      const balances = await prisma.merchantBalance.findMany({
        include: {
          merchant: {
            select: {
              firstName: true,
              lastName: true,
              fullName: true,
              email: true,
              companyName: true,
              status: true
            }
          }
        },
        orderBy: {
          lastUpdated: 'desc'
        }
      });

      return balances;
    } catch (error) {
      console.error('Error getting all merchant balances:', error);
      throw new Error('Failed to retrieve merchant balances');
    }
  }

  // Create settlement for any user type (merchant, driver, outsource)
  async createSettlement(userId, userType, amount, paymentMethod, settledBy, notes = null) {
    try {
      const settlementNumber = await this.generateSettlementNumber();

      // Get user info for settlement name
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { firstName: true, lastName: true, fullName: true, companyName: true }
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Get pending transactions for user
      const pendingTransactions = await prisma.financialTransaction.findMany({
        where: {
          userId,
          userType,
          status: 'PENDING',
          isActive: true
        },
        include: {
          order: {
            select: {
              orderNumber: true,
              customerName: true,
              productPrice: true,
              shippingFee: true,
              deliveredAt: true
            }
          }
        }
      });

      if (pendingTransactions.length === 0) {
        throw new Error(`No pending transactions found for this ${userType.toLowerCase()}`);
      }

      // Create settlement
      const settlement = await prisma.settlement.create({
        data: {
          settlementNumber,
          settlementName: `Settlement - ${user.companyName || user.fullName}`,
          userId,
          userType,
          amount,
          status: 'CLOSED',
          paymentMethod,
          notes,
          notesAr: notes,
          settledBy,
          settledAt: new Date()
        },
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              fullName: true,
              companyName: true
            }
          },
          settledByUser: {
            select: {
              firstName: true,
              lastName: true,
              fullName: true
            }
          }
        }
      });

      // Create settlement items for each transaction
      for (const transaction of pendingTransactions) {
        await prisma.settlementItem.create({
          data: {
            settlementId: settlement.id,
            orderId: transaction.orderId,
            orderNumber: transaction.order.orderNumber,
            orderStatus: 'DELIVERED',
            originalPrice: transaction.order.productPrice || 0,
            finalPrice: transaction.order.productPrice || 0,
            shippingFee: transaction.order.shippingFee || 0,
            driverCommission: userType === 'DRIVER' ? transaction.amount : null,
            outsourceCommission: userType === 'OUTSOURCE' ? transaction.amount : null, // ADD OUTSOURCE SUPPORT
            itemAmount: transaction.amount
          }
        });
      }

      // Mark transactions as settled
      await prisma.financialTransaction.updateMany({
        where: {
          userId,
          userType,
          status: 'PENDING',
          isActive: true
        },
        data: {
          status: 'SETTLED',
          settlementId: settlement.id,
          settledAt: new Date()
        }
      });

      // Update merchant balance to zero if it's a merchant settlement
      if (userType === 'MERCHANT') {
        await prisma.merchantBalance.update({
          where: { merchantId: userId },
          data: {
            totalOwedToMerchant: 0,
            totalOwedByMerchant: 0,
            netBalance: 0,
            lastUpdated: new Date()
          }
        });
      }

      return settlement;
    } catch (error) {
      console.error('Error creating settlement:', error);
      throw error.message.includes('No pending transactions') ? error : new Error('Failed to create settlement');
    }
  }

  // Get all settlements with filtering
  async getAllSettlements(options = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        userId,
        userType,
        sortBy = 'settledAt',
        sortOrder = 'desc'
      } = options;

      const skip = (page - 1) * limit;
      const where = {};

      if (userId) where.userId = userId;
      if (userType) where.userType = userType;

      const [settlements, totalCount] = await Promise.all([
        prisma.settlement.findMany({
          where,
          skip,
          take: parseInt(limit),
          orderBy: { [sortBy]: sortOrder },
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                fullName: true,
                companyName: true
              }
            },
            settledByUser: {
              select: {
                firstName: true,
                lastName: true,
                fullName: true
              }
            },
            settlementItems: {
              select: {
                orderNumber: true,
                itemAmount: true,
                driverCommission: true,
                outsourceCommission: true  // ADD OUTSOURCE SUPPORT
              }
            }
          }
        }),
        prisma.settlement.count({ where })
      ]);

      return {
        settlements,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalCount / limit),
          totalSettlements: totalCount,
          hasNext: page * limit < totalCount,
          hasPrev: page > 1
        }
      };
    } catch (error) {
      console.error('Error getting settlements:', error);
      throw new Error('Failed to retrieve settlements');
    }
  }

  // Get settlement by ID
  async getSettlementById(settlementId) {
    try {
      const settlement = await prisma.settlement.findUnique({
        where: { id: settlementId },
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              fullName: true,
              email: true,
              phone: true,
              companyName: true
            }
          },
          settledByUser: {
            select: {
              firstName: true,
              lastName: true,
              fullName: true
            }
          },
          transactions: {
            select: {
              transactionNumber: true,
              type: true,
              amount: true,
              description: true,
              order: {
                select: {
                  orderNumber: true,
                  customerName: true
                }
              }
            }
          },
          settlementItems: {
            select: {
              orderNumber: true,
              orderStatus: true,
              originalPrice: true,
              finalPrice: true,
              shippingFee: true,
              driverCommission: true,
              outsourceCommission: true,  // ADD OUTSOURCE SUPPORT
              itemAmount: true
            }
          }
        }
      });

      if (!settlement) {
        throw new Error('Settlement not found');
      }

      return settlement;
    } catch (error) {
      console.error('Error getting settlement:', error);
      throw error.message === 'Settlement not found' ? error : new Error('Failed to get settlement');
    }
  }

  // Get financial statistics
  async getFinancialStatistics() {
    try {
      const totalTransactions = await prisma.financialTransaction.count({
        where: { isActive: true }
      });

      const pendingTransactions = await prisma.financialTransaction.count({
        where: { status: 'PENDING', isActive: true }
      });

      const settledTransactions = await prisma.financialTransaction.count({
        where: { status: 'SETTLED', isActive: true }
      });

      const totalRevenue = await prisma.financialTransaction.aggregate({
        where: {
          type: 'DELIVERY_FEE_OWED',
          isActive: true
        },
        _sum: { amount: true }
      });

      const totalPayouts = await prisma.financialTransaction.aggregate({
        where: {
          type: { in: ['PRODUCT_PAYMENT_OWED', 'COMMISSION'] },
          isActive: true
        },
        _sum: { amount: true }
      });

      const pendingPayouts = await prisma.financialTransaction.aggregate({
        where: {
          type: { in: ['PRODUCT_PAYMENT_OWED', 'COMMISSION'] },
          status: 'PENDING',
          isActive: true
        },
        _sum: { amount: true }
      });

      const transactionTypes = await prisma.financialTransaction.groupBy({
        by: ['type', 'userType'],
        where: { isActive: true },
        _count: { type: true },
        _sum: { amount: true }
      });

      const recentTransactions = await prisma.financialTransaction.findMany({
        where: { isActive: true },
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              companyName: true
            }
          },
          order: {
            select: {
              orderNumber: true,
              customerName: true
            }
          }
        }
      });

      return {
        overview: {
          totalTransactions,
          pendingTransactions,
          settledTransactions,
          settlementRate: totalTransactions > 0 ? Math.round((settledTransactions / totalTransactions) * 100) : 0
        },
        financial: {
          totalRevenue: totalRevenue._sum.amount || 0,
          totalPayouts: totalPayouts._sum.amount || 0,
          pendingPayouts: pendingPayouts._sum.amount || 0,
          netProfit: (totalRevenue._sum.amount || 0) - (totalPayouts._sum.amount || 0)
        },
        transactionTypes,
        recentTransactions
      };
    } catch (error) {
      console.error('Error getting financial statistics:', error);
      throw new Error('Failed to get financial statistics');
    }
  }

  // Get driver earnings data
  async getDriverEarnings(options = {}) {
    try {
      const {
        startDate,
        endDate,
        driverId
      } = options;

      const where = {
        userId: driverId || { not: null },
        userType: 'DRIVER',
        isActive: true
      };

      if (startDate) where.createdAt = { gte: new Date(startDate) };
      if (endDate) where.createdAt = { ...where.createdAt, lte: new Date(endDate) };

      const driverTransactions = await prisma.financialTransaction.groupBy({
        by: ['userId'],
        where,
        _count: { id: true },
        _sum: { amount: true }
      });

      const driverEarnings = await Promise.all(
        driverTransactions.map(async (transaction) => {
          const driver = await prisma.user.findUnique({
            where: { id: transaction.userId },
            select: {
              firstName: true,
              lastName: true,
              fullName: true,
              phone: true,
              deliveryCommission: true
            }
          });

          return {
            driverId: transaction.userId,
            driver,
            deliveryCount: transaction._count.id,
            totalEarnings: transaction._sum.amount || 0
          };
        })
      );

      return driverEarnings;
    } catch (error) {
      console.error('Error getting driver earnings:', error);
      throw new Error('Failed to get driver earnings');
    }
  }

  // Get outsource earnings data - NEW METHOD
  async getOutsourceEarnings(options = {}) {
    try {
      const {
        startDate,
        endDate,
        outsourceId
      } = options;

      const where = {
        userId: outsourceId || { not: null },
        userType: 'OUTSOURCE',
        isActive: true
      };

      if (startDate) where.createdAt = { gte: new Date(startDate) };
      if (endDate) where.createdAt = { ...where.createdAt, lte: new Date(endDate) };

      const outsourceTransactions = await prisma.financialTransaction.groupBy({
        by: ['userId'],
        where,
        _count: { id: true },
        _sum: { amount: true }
      });

      const outsourceEarnings = await Promise.all(
        outsourceTransactions.map(async (transaction) => {
          const outsource = await prisma.user.findUnique({
            where: { id: transaction.userId },
            select: {
              firstName: true,
              lastName: true,
              fullName: true,
              phone: true,
              companyName: true,
              deliveryCommission: true
            }
          });

          return {
            outsourceId: transaction.userId,
            outsource,
            deliveryCount: transaction._count.id,
            totalEarnings: transaction._sum.amount || 0,
            averagePerOrder: (transaction._sum.amount || 0) / transaction._count.id
          };
        })
      );

      return outsourceEarnings;
    } catch (error) {
      console.error('Error getting outsource earnings:', error);
      throw new Error('Failed to get outsource earnings');
    }
  }

  // Get user balance (works for any user type)
  async getUserBalance(userId, userType) {
    try {
      const pendingTransactions = await prisma.financialTransaction.aggregate({
        where: {
          userId,
          userType,
          status: 'PENDING',
          isActive: true
        },
        _sum: { amount: true }
      });

      const settledTransactions = await prisma.financialTransaction.aggregate({
        where: {
          userId,
          userType,
          status: 'SETTLED',
          isActive: true
        },
        _sum: { amount: true }
      });

      return {
        userId,
        userType,
        pendingAmount: pendingTransactions._sum.amount || 0,
        settledAmount: settledTransactions._sum.amount || 0,
        totalAmount: (pendingTransactions._sum.amount || 0) + (settledTransactions._sum.amount || 0)
      };
    } catch (error) {
      console.error('Error getting user balance:', error);
      throw new Error('Failed to get user balance');
    }
  }
}

module.exports = new FinancialService();