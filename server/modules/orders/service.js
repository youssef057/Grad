const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { VALID_STATUS_TRANSITIONS, ERROR_MESSAGES_AR } = require('../../config/constants');

class OrderService {
  // Auto-generate order number (following Vehicle pattern)
  async generateOrderNumber() {
    try {
      const lastOrder = await prisma.order.findFirst({
        orderBy: { orderNumber: 'desc' },
        select: { orderNumber: true }
      });

      if (!lastOrder) {
        return 'ORD-001';
      }

      // Extract number from ORD-XXX format
      const lastNumber = parseInt(lastOrder.orderNumber.split('-')[1]);
      const nextNumber = (lastNumber + 1).toString().padStart(3, '0');
      return `ORD-${nextNumber}`;
    } catch (error) {
      console.error('Error generating order number:', error);
      throw new Error('Failed to generate order number');
    }
  }

  generateTrackingNumber() {
  const year = new Date().getFullYear();
  const randomPart = Math.floor(Math.random() * 900000) + 100000; // 6 digits
  return `RNX-${year}-${randomPart}`;
}

// Ensure tracking number is unique
    async generateUniqueTrackingNumber() {
      let trackingNumber;
      let isUnique = false;
      let attempts = 0;
      const maxAttempts = 10;

      while (!isUnique && attempts < maxAttempts) {
        trackingNumber = this.generateTrackingNumber();
        
        const existingOrder = await prisma.order.findUnique({
          where: { trackingNumber }
        });
        
        if (!existingOrder) {
          isUnique = true;
        }
        attempts++;
      }

      if (!isUnique) {
        throw new Error('Unable to generate unique tracking number');
      }

      return trackingNumber;
    }

  // Create new order
  async createOrder(orderData) {
    try {
      const orderNumber = await this.generateOrderNumber();
      const trackingNumber = await this.generateUniqueTrackingNumber(); // ← ADD THIS
      
      const newOrder = await prisma.order.create({
        data: {
          ...orderData,
          orderNumber,
          trackingNumber
        },
        include: {
          merchant: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              fullName: true,
              email: true,
              phone: true,
              companyName: true,
              address: true
            }
          },
          customer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true
            }
          },
          vehicle: {
            select: {
              id: true,
              name: true,
              nameAr: true,
              vehicleNumber: true
            }
          },
          driver: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              fullName: true,
              phone: true
            }
          }
        }
      });

      return newOrder;
    } catch (error) {
      console.error('Error creating order:', error);
      throw new Error('Failed to create order');
    }
  }

  // Get all orders with filtering and pagination (following Vehicle pattern)
  async getAllOrders(options = {}) {
    try {
      const {
        page = 1,
        limit = 10,
        search = '',
        status = '',
        paymentMethod = '',
        merchantId = '',
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = options;

      const skip = (page - 1) * limit;
      const where = { isActive: true };

      // Search functionality
      if (search) {
        where.OR = [
          { orderNumber: { contains: search, mode: 'insensitive' } },
          { customerName: { contains: search, mode: 'insensitive' } },
          { customerNameAr: { contains: search, mode: 'insensitive' } },
          { customerPhone: { contains: search, mode: 'insensitive' } },
          { packageDescription: { contains: search, mode: 'insensitive' } },
          { packageDescriptionAr: { contains: search, mode: 'insensitive' } }
        ];
      }

      // Filters
      if (status) where.status = status;
      if (paymentMethod) where.paymentMethod = paymentMethod;
      if (merchantId) where.merchantId = merchantId;

      const [orders, total] = await Promise.all([
        prisma.order.findMany({
          where,
          include: {
            merchant: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                fullName: true,
                companyName: true
              }
            },
            customer: {
              select: {
                id: true,
                firstName: true,
                lastName: true
              }
            },
            vehicle: {
              select: {
                id: true,
                name: true,
                vehicleNumber: true
              }
            },
            driver: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                fullName: true
              }
            }
          },
          skip,
          take: parseInt(limit),
          orderBy: { [sortBy]: sortOrder }
        }),
        prisma.order.count({ where })
      ]);

      return {
        orders,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalOrders: total,
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      };
    } catch (error) {
      console.error('Error fetching orders:', error);
      throw new Error('Failed to fetch orders');
    }
  }

  // Get order by ID
  async getOrderById(id) {
    try {
      const order = await prisma.order.findUnique({
        where: { id, isActive: true },
        include: {
          merchant: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              fullName: true,
              email: true,
              phone: true,
              companyName: true,
              address: true,
              city: true,
              state: true
            }
          },
          customer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true
            }
          },
          vehicle: {
            select: {
              id: true,
              name: true,
              nameAr: true,
              vehicleNumber: true,
              type: true,
              status: true
            }
          },
          driver: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              fullName: true,
              phone: true,
              driverAvailability: true
            }
          }
        }
      });

      if (!order) {
        throw new Error('Order not found');
      }

      return order;
    } catch (error) {
      console.error('Error fetching order:', error);
      throw new Error(error.message === 'Order not found' ? 'Order not found' : 'Failed to fetch order');
    }
  }

  // Update order
  async updateOrder(id, updateData) {
    try {
      const updatedOrder = await prisma.order.update({
        where: { id, isActive: true },
        data: updateData,
        include: {
          merchant: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              fullName: true,
              companyName: true
            }
          },
          vehicle: {
            select: {
              id: true,
              name: true,
              vehicleNumber: true
            }
          },
          driver: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              fullName: true
            }
          }
        }
      });

      return updatedOrder;
    } catch (error) {
      console.error('Error updating order:', error);
      throw new Error('Failed to update order');
    }
  }

  // Soft delete order
  async deleteOrder(id) {
    try {
      const deletedOrder = await prisma.order.update({
        where: { id, isActive: true },
        data: { isActive: false }
      });

      return deletedOrder;
    } catch (error) {
      console.error('Error deleting order:', error);
      throw new Error('Failed to delete order');
    }
  }

  // Assign vehicle to order (following Vehicle assignment pattern)
  async assignVehicleToOrder(orderId, vehicleId, assignedBy) {
    try {
      // Get vehicle with driver info
      const vehicle = await prisma.vehicle.findUnique({
        where: { id: vehicleId },
        include: { driver: true }
      });

      if (!vehicle) {
        throw new Error('Vehicle not found');
      }

      const updateData = {
        vehicleId,
        assignedAt: new Date(),
        assignedBy,
        status: 'ASSIGNED'
      };

      // If vehicle has driver, assign driver too
      if (vehicle.driverId) {
        updateData.driverId = vehicle.driverId;
      }

      const updatedOrder = await prisma.order.update({
        where: { id: orderId, isActive: true },
        data: updateData,
        include: {
          vehicle: true,
          driver: true,
          merchant: { select: { firstName: true, lastName: true, companyName: true } }
        }
      });

      return updatedOrder;
    } catch (error) {
      console.error('Error assigning vehicle to order:', error);
      throw new Error('Failed to assign vehicle to order');
    }
  }

  // Unassign vehicle from order
  async unassignVehicleFromOrder(orderId) {
    try {
      const updatedOrder = await prisma.order.update({
        where: { id: orderId, isActive: true },
        data: {
          vehicleId: null,
          driverId: null,
          assignedAt: null,
          assignedBy: null,
          status: 'PENDING'
        },
        include: {
          merchant: { select: { firstName: true, lastName: true, companyName: true } }
        }
      });

      return updatedOrder;
    } catch (error) {
      console.error('Error unassigning vehicle from order:', error);
      throw new Error('Failed to unassign vehicle from order');
    }
  }

  // Update order status
async updateOrderStatus(orderId, newStatus) {
  try {
    // Get current order with status validation
    const currentOrder = await prisma.order.findUnique({
      where: { id: orderId, isActive: true },
      select: { 
        status: true, 
        orderNumber: true,
        driverId: true,
        outsourceId: true
      }
    });
    
    if (!currentOrder) {
      const error = new Error('Order not found');
      error.messageAr = 'الطلب غير موجود';
      throw error;
    }
    
    // Validate status transition using constants
    const allowedTransitions = VALID_STATUS_TRANSITIONS[currentOrder.status] || [];
    if (!allowedTransitions.includes(newStatus)) {
      const allowedArabic = allowedTransitions.map(status => {
        const { ORDER_STATUS_AR } = require('../../config/constants');
        return ORDER_STATUS_AR[status] || status;
      }).join(', ');
      
      const error = new Error(`Cannot transition from ${currentOrder.status} to ${newStatus}. Allowed transitions: ${allowedTransitions.join(', ')}`);
      error.messageAr = ERROR_MESSAGES_AR.INVALID_STATUS_TRANSITION
        .replace('{from}', currentOrder.status)
        .replace('{to}', newStatus)
        .replace('{allowed}', allowedArabic);
      throw error;
    }

    // Prepare status update data with timestamps
    const statusUpdateData = { status: newStatus };

    // Add appropriate timestamps based on status
    if (newStatus === 'PICKED_UP') {
      statusUpdateData.pickedUpAt = new Date();
    } else if (newStatus === 'IN_TRANSIT') {
      statusUpdateData.inTransitAt = new Date();
    } else if (newStatus === 'DELIVERED') {
      statusUpdateData.deliveredAt = new Date();
    } else if (newStatus === 'PARTIALLY_DELIVERED') {
      statusUpdateData.partiallyDeliveredAt = new Date();
    } else if (newStatus === 'RETURNED') {
      statusUpdateData.returnedAt = new Date();
      // Clear assignments when returned
      statusUpdateData.driverId = null;
      statusUpdateData.outsourceId = null;
      statusUpdateData.vehicleId = null;
      statusUpdateData.assignedAt = null;
      statusUpdateData.assignedBy = null;
    } else if (newStatus === 'CANCELLED') {
      statusUpdateData.cancelledAt = new Date();
      // Clear assignments when cancelled
      statusUpdateData.driverId = null;
      statusUpdateData.outsourceId = null;
      statusUpdateData.vehicleId = null;
      statusUpdateData.assignedAt = null;
      statusUpdateData.assignedBy = null;
    }

    // Update the order with new status and timestamps
    const updatedOrder = await prisma.order.update({
      where: { id: orderId, isActive: true },
      data: statusUpdateData,
      include: {
        merchant: { 
          select: { 
            firstName: true, 
            lastName: true, 
            companyName: true,
            fullName: true
          } 
        },
        vehicle: { 
          select: { 
            name: true, 
            vehicleNumber: true 
          } 
        },
        driver: { 
          select: { 
            firstName: true, 
            lastName: true, 
            fullName: true,
            phone: true
          } 
        },
        outsource: {
          select: {
            firstName: true,
            lastName: true,
            fullName: true,
            companyName: true,
            phone: true
          }
        }
      }
    });

    return updatedOrder;
  } catch (error) {
    console.error('Error updating order status:', error);
    throw error; // Re-throw with original message and messageAr
  }
}

  // Get available vehicles (following Vehicle service pattern)
  async getAvailableVehicles() {
    try {
      return await prisma.vehicle.findMany({
        where: {
          status: 'AVAILABLE',
          isActive: true
        },
        include: {
          driver: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              fullName: true,
              phone: true,
              driverAvailability: true
            }
          }
        },
        orderBy: { name: 'asc' }
      });
    } catch (error) {
      console.error('Error fetching available vehicles:', error);
      throw new Error('Failed to fetch available vehicles');
    }
  }

  // Get orders by merchant
  async getOrdersByMerchant(merchantId, options = {}) {
    try {
      const { page = 1, limit = 10, status = '' } = options;
      const skip = (page - 1) * limit;
      const where = { merchantId, isActive: true };

      if (status) where.status = status;

      return await prisma.order.findMany({
        where,
        include: {
          vehicle: { select: { name: true, vehicleNumber: true } },
          driver: { select: { firstName: true, lastName: true, fullName: true } }
        },
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' }
      });
    } catch (error) {
      console.error('Error fetching merchant orders:', error);
      throw new Error('Failed to fetch merchant orders');
    }
  }

  // Get orders by driver
  async getOrdersByDriver(driverId, options = {}) {
    try {
      const { status = '' } = options;
      const where = { driverId, isActive: true };

      if (status) where.status = status;

      return await prisma.order.findMany({
        where,
        include: {
          merchant: { select: { firstName: true, lastName: true, companyName: true } }
        },
        orderBy: { createdAt: 'desc' }
      });
    } catch (error) {
      console.error('Error fetching driver orders:', error);
      throw new Error('Failed to fetch driver orders');
    }
  }

  // Get order statistics (following Vehicle statistics pattern)
  async getOrderStatistics() {
    try {
      // Status distribution
      const statusCounts = await prisma.order.groupBy({
        by: ['status'],
        where: { isActive: true },
        _count: { status: true }
      });

      // Payment method distribution  
      const paymentCounts = await prisma.order.groupBy({
        by: ['paymentMethod'],
        where: { isActive: true },
        _count: { paymentMethod: true }
      });

      // Priority distribution
      const priorityCounts = await prisma.order.groupBy({
        by: ['priority'],
        where: { isActive: true },
        _count: { priority: true }
      });

      // Total orders and assignment stats
      const totalOrders = await prisma.order.count({ where: { isActive: true } });
      const assignedOrders = await prisma.order.count({ 
        where: { isActive: true, vehicleId: { not: null } } 
      });

      // Revenue stats (basic)
      const revenueStats = await prisma.order.aggregate({
        where: { isActive: true },
        _sum: { shippingFee: true, productPrice: true },
        _avg: { shippingFee: true, productPrice: true }
      });

      // Recent orders
      const recentOrders = await prisma.order.findMany({
        where: { isActive: true },
        include: { merchant: { select: { firstName: true, lastName: true, companyName: true } } },
        orderBy: { createdAt: 'desc' },
        take: 5
      });

      return {
        overview: {
          totalOrders,
          assignedOrders,
          unassignedOrders: totalOrders - assignedOrders,
          assignmentRate: totalOrders > 0 ? Math.round((assignedOrders / totalOrders) * 100) : 0
        },
        statusDistribution: statusCounts,
        paymentMethodDistribution: paymentCounts,
        priorityDistribution: priorityCounts,
        revenue: {
          totalShippingRevenue: revenueStats._sum.shippingFee || 0,
          totalProductValue: revenueStats._sum.productPrice || 0,
          averageShippingFee: Math.round(revenueStats._avg.shippingFee || 0),
          averageOrderValue: Math.round(revenueStats._avg.productPrice || 0)
        },
        recentOrders
      };
    } catch (error) {
      console.error('Error fetching order statistics:', error);
      throw new Error('Failed to fetch order statistics');
    }
  }

  async getOrdersWithAdvancedFilter(filters) {
  try {
    const whereClause = { isActive: true };
    
    // Geographic filters
    if (filters.governorate) {
      whereClause.deliveryGovernorate = filters.governorate;
    }
    
    if (filters.area) {
      whereClause.deliveryArea = filters.area;
    }
    
    if (filters.areas && Array.isArray(filters.areas)) {
      whereClause.deliveryArea = {
        in: filters.areas
      };
    }
    
    // Status filters
    if (filters.status) {
      whereClause.status = Array.isArray(filters.status) 
        ? { in: filters.status }
        : filters.status;
    }
    
    // Assignment type filter
    if (filters.assignmentType === 'unassigned') {
      whereClause.driverId = null;
      whereClause.outsourceId = null;
      whereClause.vehicleId = null;
    } else if (filters.assignmentType === 'driver') {
      whereClause.driverId = { not: null };
    } else if (filters.assignmentType === 'outsource') {
      whereClause.outsourceId = { not: null };
    } else if (filters.assignmentType === 'vehicle') {
      whereClause.vehicleId = { not: null };
    }
    
    // Priority filter
    if (filters.priority) {
      whereClause.priority = Array.isArray(filters.priority)
        ? { in: filters.priority }
        : filters.priority;
    }
    
    // Payment method filter
    if (filters.paymentMethod) {
      whereClause.paymentMethod = Array.isArray(filters.paymentMethod)
        ? { in: filters.paymentMethod }
        : filters.paymentMethod;
    }
    
    // Package type filter
    if (filters.packageType) {
      whereClause.packageType = Array.isArray(filters.packageType)
        ? { in: filters.packageType }
        : filters.packageType;
    }
    
    // Date range filter
    if (filters.dateRange) {
      const now = new Date();
      if (filters.dateRange === 'today') {
        const startOfDay = new Date(now.setHours(0, 0, 0, 0));
        const endOfDay = new Date(now.setHours(23, 59, 59, 999));
        whereClause.createdAt = {
          gte: startOfDay,
          lte: endOfDay
        };
      } else if (filters.dateRange === 'thisweek') {
        const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
        whereClause.createdAt = {
          gte: startOfWeek
        };
      }
    }
    
    // Custom date range
    if (filters.startDate && filters.endDate) {
      whereClause.createdAt = {
        gte: new Date(filters.startDate),
        lte: new Date(filters.endDate)
      };
    }
    
    return await prisma.order.findMany({
      where: whereClause,
      include: {
        merchant: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            fullName: true,
            companyName: true
          }
        },
        driver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            fullName: true,
            phone: true
          }
        },
        outsource: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            fullName: true,
            companyName: true,
            phone: true
          }
        },
        vehicle: {
          select: {
            id: true,
            name: true,
            vehicleNumber: true,
            type: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  } catch (error) {
    console.error('Error filtering orders:', error);
    throw new Error('Failed to filter orders');
  }
}

// Bulk driver assignment
async assignBulkDriver(orderIds, driverId, vehicleId, assignedBy) {
  return await prisma.$transaction(async (tx) => {
    try {
      // 1. Validate orders exist and are assignable
      const orders = await tx.order.findMany({
        where: {
          id: { in: orderIds },
          isActive: true
        },
        select: { 
          id: true, 
          status: true, 
          orderNumber: true, 
          driverId: true, 
          outsourceId: true, 
          vehicleId: true 
        }
      });

      if (orders.length !== orderIds.length) {
        const error = new Error('Some orders not found or inactive');
        error.messageAr = ERROR_MESSAGES_AR.ORDERS_NOT_FOUND;
        throw error;
      }

      // 2. Check for assignment conflicts
      const conflictOrders = orders.filter(o => 
        o.driverId !== null || o.outsourceId !== null || o.vehicleId !== null
      );
      
      if (conflictOrders.length > 0) {
        const orderNumbers = conflictOrders.map(o => o.orderNumber).join(', ');
        const error = new Error(`Orders already assigned: ${orderNumbers}`);
        error.messageAr = ERROR_MESSAGES_AR.ORDERS_ALREADY_ASSIGNED.replace('{orderNumbers}', orderNumbers);
        throw error;
      }

      // 3. Check order status
      const nonPendingOrders = orders.filter(o => o.status !== 'PENDING');
      if (nonPendingOrders.length > 0) {
        const orderNumbers = nonPendingOrders.map(o => o.orderNumber).join(', ');
        const error = new Error(`Orders not in PENDING status: ${orderNumbers}`);
        error.messageAr = ERROR_MESSAGES_AR.ORDERS_NOT_PENDING.replace('{orderNumbers}', orderNumbers);
        throw error;
      }

      // 4. Validate driver exists and is active
      const driver = await tx.user.findUnique({
        where: { id: driverId, role: 'DRIVER' },
        select: { 
          id: true, 
          firstName: true, 
          lastName: true, 
          fullName: true, 
          status: true 
        }
      });
      
      if (!driver) {
        const error = new Error('Driver not found');
        error.messageAr = ERROR_MESSAGES_AR.DRIVER_NOT_FOUND;
        throw error;
      }

      if (driver.status !== 'ACTIVE') {
        const error = new Error('Driver is not active');
        error.messageAr = ERROR_MESSAGES_AR.DRIVER_NOT_ACTIVE;
        throw error;
      }

      // 5. Check driver capacity using SystemConfig
      const SystemConfigService = require('../systemConfig/service');
      const maxOrdersPerDriver = await SystemConfigService.getMaxOrdersPerDriver();
      
      const driverCurrentOrders = await tx.order.count({
        where: {
          driverId,
          status: { in: ['ASSIGNED', 'PICKED_UP', 'IN_TRANSIT'] },
          isActive: true
        }
      });

      if (driverCurrentOrders + orderIds.length > maxOrdersPerDriver) {
        const error = new Error(`Driver can only handle ${maxOrdersPerDriver} orders. Currently has ${driverCurrentOrders}, trying to assign ${orderIds.length} more`);
        error.messageAr = ERROR_MESSAGES_AR.DRIVER_CAPACITY_EXCEEDED
          .replace('{max}', maxOrdersPerDriver)
          .replace('{current}', driverCurrentOrders);
        throw error;
      }

      // 6. Validate vehicle if provided
      let vehicle = null;
      if (vehicleId) {
        vehicle = await tx.vehicle.findUnique({
          where: { id: vehicleId },
          select: { 
            id: true, 
            name: true, 
            vehicleNumber: true, 
            status: true 
          }
        });
        
        if (!vehicle) {
          const error = new Error('Vehicle not found');
          error.messageAr = ERROR_MESSAGES_AR.VEHICLE_NOT_FOUND;
          throw error;
        }

        if (vehicle.status !== 'AVAILABLE') {
          const error = new Error('Vehicle is not available');
          error.messageAr = ERROR_MESSAGES_AR.VEHICLE_NOT_AVAILABLE;
          throw error;
        }
      }
      
      // 7. Prepare update data
      const updateData = {
        driverId,
        outsourceId: null,
        assignedAt: new Date(),
        assignedBy,
        status: 'ASSIGNED'
      };
      
      if (vehicleId) {
        updateData.vehicleId = vehicleId;
      }
      
      // 8. Bulk update orders
      const updatedOrders = await tx.order.updateMany({
        where: {
          id: { in: orderIds }
        },
        data: updateData
      });
      
      return {
        assignedCount: updatedOrders.count,
        driverName: driver.fullName || `${driver.firstName} ${driver.lastName}`,
        vehicleName: vehicle ? vehicle.name : null,
        orderIds,
        maxOrdersPerDriver,
        driverCurrentOrders: driverCurrentOrders + orderIds.length
      };
    } catch (error) {
      console.error('Error assigning bulk driver:', error);
      throw error; // Re-throw with original message and messageAr
    }
  });
}

// Bulk outsource assignment
async assignBulkOutsource(orderIds, outsourceId, assignedBy, commissionRate = null) {
  return await prisma.$transaction(async (tx) => {
    try {
      // 1. Validate orders exist and are assignable
      const orders = await tx.order.findMany({
        where: {
          id: { in: orderIds },
          isActive: true
        },
        select: { 
          id: true, 
          status: true, 
          orderNumber: true, 
          driverId: true, 
          outsourceId: true, 
          vehicleId: true,
          shippingFee: true,
        }
      });

      if (orders.length !== orderIds.length) {
        const error = new Error('Some orders not found or inactive');
        error.messageAr = ERROR_MESSAGES_AR.ORDERS_NOT_FOUND;
        throw error;
      }

      // 2. Check for assignment conflicts
      const conflictOrders = orders.filter(o => 
        o.driverId !== null || o.outsourceId !== null || o.vehicleId !== null
      );
      
      if (conflictOrders.length > 0) {
        const orderNumbers = conflictOrders.map(o => o.orderNumber).join(', ');
        const error = new Error(`Orders already assigned: ${orderNumbers}`);
        error.messageAr = ERROR_MESSAGES_AR.ORDERS_ALREADY_ASSIGNED.replace('{orderNumbers}', orderNumbers);
        throw error;
      }

      // 3. Check order status
      const nonPendingOrders = orders.filter(o => o.status !== 'PENDING');
      if (nonPendingOrders.length > 0) {
        const orderNumbers = nonPendingOrders.map(o => o.orderNumber).join(', ');
        const error = new Error(`Orders not in PENDING status: ${orderNumbers}`);
        error.messageAr = ERROR_MESSAGES_AR.ORDERS_NOT_PENDING.replace('{orderNumbers}', orderNumbers);
        throw error;
      }

      // 4. Validate outsource partner exists and is active
      const outsource = await tx.user.findUnique({
        where: { id: outsourceId, role: 'OUTSOURCE' },
        select: { 
          id: true, 
          firstName: true, 
          lastName: true, 
          fullName: true, 
          companyName: true,
          deliveryCommission: true,
          status: true
        }
      });
      
      if (!outsource) {
        const error = new Error('Outsource partner not found');
        error.messageAr = ERROR_MESSAGES_AR.OUTSOURCE_NOT_FOUND;
        throw error;
      }

      if (outsource.status !== 'ACTIVE') {
        const error = new Error('Outsource partner is not active');
        error.messageAr = 'الشريك الخارجي غير نشط';
        throw error;
      }

      // 5. Calculate commission rate
      const finalCommissionRate = commissionRate || outsource.deliveryCommission || 25.0;
      
      // Validate commission rate
      if (finalCommissionRate < 0 || finalCommissionRate > 100) {
        const error = new Error('Commission rate must be between 0 and 100');
        error.messageAr = 'معدل العمولة يجب أن يكون بين 0 و 100';
        throw error;
      }

      // 6. Calculate total commission amount
      const fixedPricePerOrder = commissionRate || outsource.deliveryCommission || 25.0; // EGP per order
      const totalCommissionAmount = orders.length * fixedPricePerOrder; // Fixed price × number of orders

      // 7. Bulk update orders with commission data
      const updatedOrders = await tx.order.updateMany({
        where: {
          id: { in: orderIds }
        },
        data: {
          outsourceId,
          driverId: null,
          vehicleId: null,
          assignedAt: new Date(),
          assignedBy,
          status: 'ASSIGNED',
          outsourceCommission: fixedPricePerOrder,        // Fixed price per order
          outsourceCommissionAmount: fixedPricePerOrder   // Same amount per order
        }
      });

      return {
        assignedCount: updatedOrders.count,
        outsourceName: outsource.companyName || outsource.fullName || `${outsource.firstName} ${outsource.lastName}`,
        fixedPricePerOrder,
        totalCommissionAmount,
        orderIds
      };
    } catch (error) {
      console.error('Error assigning bulk outsource:', error);
      throw error; // Re-throw with original message and messageAr
    }
  });
}

// Bulk unassignment
async unassignBulkOrders(orderIds) {
  try {
    const updatedOrders = await prisma.order.updateMany({
      where: {
        id: { in: orderIds },
        isActive: true
      },
      data: {
        vehicleId: null,
        driverId: null,
        outsourceId: null,
        assignedAt: null,
        assignedBy: null,
        status: 'PENDING'
      }
    });
    
    return {
      unassignedCount: updatedOrders.count,
      orderIds
    };
  } catch (error) {
    console.error('Error unassigning bulk orders:', error);
    throw new Error('Failed to unassign orders');
  }
}

// Get available drivers for assignment
async getAvailableDrivers() {
  try {
    return await prisma.user.findMany({
      where: {
        role: 'DRIVER',
        status: 'ACTIVE',
        driverAvailability: {
          in: ['AVAILABLE', 'ON_BREAK']
        }
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        fullName: true,
        phone: true,
        deliveryCommission: true,
        driverAvailability: true
      },
      orderBy: { firstName: 'asc' }
    });
  } catch (error) {
    console.error('Error fetching available drivers:', error);
    throw new Error('Failed to fetch available drivers');
  }
}

// Get available outsource partners
async getAvailableOutsource() {
  try {
    return await prisma.user.findMany({
      where: {
        role: 'OUTSOURCE',
        status: 'ACTIVE'
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        fullName: true,
        companyName: true,
        phone: true
      },
      orderBy: { companyName: 'asc' }
    });
  } catch (error) {
    console.error('Error fetching available outsource:', error);
    throw new Error('Failed to fetch available outsource partners');
  }
}

// Get geographic statistics (governorate/area distribution)
async getGeographicStatistics() {
  try {
    const governorateStats = await prisma.order.groupBy({
      by: ['deliveryGovernorate'],
      where: { isActive: true },
      _count: { deliveryGovernorate: true }
    });
    
    const areaStats = await prisma.order.groupBy({
      by: ['deliveryArea'],
      where: { isActive: true },
      _count: { deliveryArea: true },
      orderBy: { _count: { deliveryArea: 'desc' } },
      take: 10  // Top 10 areas
    });
    
    return {
      governorateDistribution: governorateStats,
      topAreas: areaStats
    };
  } catch (error) {
    console.error('Error fetching geographic statistics:', error);
    throw new Error('Failed to fetch geographic statistics');
  }
}

async getOrderByTrackingNumber(trackingNumber) {
  try {
    const order = await prisma.order.findUnique({
      where: { trackingNumber },
      select: {
        // Public-safe information only
        trackingNumber: true,
        orderNumber: true,
        status: true,
        customerName: true,
        deliveryAddress: true,
        deliveryArea: true,
        deliveryGovernorate: true,
        expectedDeliveryDate: true,
        deliveryTimeWindow: true,
        packageDescription: true,
        paymentMethod: true,
        priority: true,
        
        // Timestamps for status timeline
        createdAt: true,
        assignedAt: true,
        pickedUpAt: true,
        inTransitAt: true,
        deliveredAt: true,
        
        // Delivery partner info (limited)
        driver: {
          select: {
            firstName: true,
            phone: true
          }
        },
        outsource: {
          select: {
            companyName: true,
            phone: true
          }
        },
        
        // Vehicle info (basic)
        vehicle: {
          select: {
            name: true,
            vehicleNumber: true
          }
        }
      }
    });

    if (!order) {
      throw new Error('Order not found with this tracking number');
    }

    // Build status timeline from existing timestamps
    const statusTimeline = this.buildStatusTimeline(order);

    return {
      ...order,
      statusTimeline
    };
  } catch (error) {
    console.error('❌ Error fetching order by tracking number:', error);
    throw error;
  }
}

// Helper method to build status timeline
buildStatusTimeline(order) {
  const timeline = [];
  
  // Order created
  timeline.push({
    status: 'PENDING',
    timestamp: order.createdAt,
    title: 'Order Confirmed',
    titleAr: 'تم تأكيد الطلب',
    description: 'Your order has been received and is being processed',
    descriptionAr: 'تم استلام طلبك وجاري المعالجة'
  });

  // Order assigned
  if (order.assignedAt) {
    const assignedTo = order.driver 
      ? `Driver ${order.driver.firstName}` 
      : order.outsource 
      ? `${order.outsource.companyName}`
      : 'Delivery partner';
      
    timeline.push({
      status: 'ASSIGNED',
      timestamp: order.assignedAt,
      title: 'Assigned to Delivery Partner',
      titleAr: 'تم التكليف لشريك التوصيل',
      description: `Assigned to ${assignedTo}`,
      descriptionAr: `تم التكليف إلى ${assignedTo}`
    });
  }

  // Picked up
  if (order.pickedUpAt) {
    timeline.push({
      status: 'PICKED_UP',
      timestamp: order.pickedUpAt,
      title: 'Package Picked Up',
      titleAr: 'تم استلام الطرد',
      description: 'Package has been collected from merchant',
      descriptionAr: 'تم استلام الطرد من التاجر'
    });
  }

  // In transit
  if (order.inTransitAt) {
    timeline.push({
      status: 'IN_TRANSIT',
      timestamp: order.inTransitAt,
      title: 'Out for Delivery',
      titleAr: 'في الطريق للتوصيل',
      description: 'Package is on the way to your location',
      descriptionAr: 'الطرد في الطريق إلى موقعك'
    });
  }

  // Delivered
  if (order.deliveredAt) {
    timeline.push({
      status: 'DELIVERED',
      timestamp: order.deliveredAt,
      title: 'Successfully Delivered',
      titleAr: 'تم التوصيل بنجاح',
      description: 'Package has been delivered to customer',
      descriptionAr: 'تم توصيل الطرد للعميل'
    });
  }

  return timeline.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
}

    async assignDriverToOrder(orderId, driverId, vehicleId = null, assignedBy) {
      try {
        // Reuse bulk logic for single order
        return await this.assignBulkDriver([orderId], driverId, vehicleId, assignedBy);
      } catch (error) {
        console.error('Error assigning driver to order:', error);
        throw error;
      }
    }

    // Individual unassignment
    async unassignOrder(orderId) {
      try {
        return await this.unassignBulkOrders([orderId]);
      } catch (error) {
        console.error('Error unassigning order:', error);
        throw error;
      }
    }

    // Combined status update with assignment
    async updateStatusAndAssign(orderId, status, driverId = null, vehicleId = null) {
      return await prisma.$transaction(async (tx) => {
        // First assign if provided
        if (driverId) {
          await this.assignDriverToOrder(orderId, driverId, vehicleId, 'system');
        }
        
        // Then update status
        return await this.updateOrderStatus(orderId, status);
      });
    }

}

module.exports = new OrderService();