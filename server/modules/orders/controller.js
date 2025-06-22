const OrderService = require('./service');

class OrderController {
  // Create new order
  async createOrder(req, res) {
    try {
      // For merchants creating orders, set merchantId to their own ID
      if (req.user.role === 'MERCHANT') {
        req.body.merchantId = req.user.id;
      }

      const order = await OrderService.createOrder(req.body);

      res.status(201).json({
        success: true,
        message: 'Order created successfully',
        messageAr: 'تم إنشاء الطلب بنجاح',
        data: order
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to create order'
      });
    }
  }

  // Get all orders with filtering and pagination
  async getAllOrders(req, res) {
    try {
      const options = {
        page: req.query.page,
        limit: req.query.limit,
        search: req.query.search,
        status: req.query.status,
        paymentMethod: req.query.paymentMethod,
        merchantId: req.query.merchantId,
        sortBy: req.query.sortBy,
        sortOrder: req.query.sortOrder
      };

      // If user is merchant, only show their orders
      if (req.user.role === 'MERCHANT') {
        options.merchantId = req.user.id;
      }

      const result = await OrderService.getAllOrders(options);

      res.status(200).json({
        success: true,
        message: 'Orders retrieved successfully',
        messageAr: 'تم استرجاع الطلبات بنجاح',
        data: result.orders,
        pagination: result.pagination
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get orders'
      });
    }
  }

  // Get order by ID
  async getOrderById(req, res) {
    try {
      const order = await OrderService.getOrderById(req.params.id);

      // Check ownership for merchants
      if (req.user.role === 'MERCHANT' && order.merchantId !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'You can only access your own orders'
        });
      }

      res.status(200).json({
        success: true,
        message: 'Order retrieved successfully',
        messageAr: 'تم استرجاع الطلب بنجاح',
        data: order
      });
    } catch (error) {
      const statusCode = error.message === 'Order not found' ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Failed to get order'
      });
    }
  }

  // Update order
  async updateOrder(req, res) {
    try {
      // Check if order exists and get ownership info
      const existingOrder = await OrderService.getOrderById(req.params.id);
      
      // Check ownership for merchants
      if (req.user.role === 'MERCHANT' && existingOrder.merchantId !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'You can only update your own orders'
        });
      }

      // Merchants cannot change merchantId
      if (req.user.role === 'MERCHANT') {
        delete req.body.merchantId;
      }

      const order = await OrderService.updateOrder(req.params.id, req.body);

      res.status(200).json({
        success: true,
        message: 'Order updated successfully',
        messageAr: 'تم تحديث الطلب بنجاح',
        data: order
      });
    } catch (error) {
      const statusCode = error.message === 'Order not found' ? 404 : 400;
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Failed to update order'
      });
    }
  }

  // Delete order (soft delete)
  async deleteOrder(req, res) {
    try {
      // Check if order exists and get ownership info
      const existingOrder = await OrderService.getOrderById(req.params.id);
      
      // Check ownership for merchants
      if (req.user.role === 'MERCHANT' && existingOrder.merchantId !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'You can only delete your own orders'
        });
      }

      await OrderService.deleteOrder(req.params.id);

      res.status(200).json({
        success: true,
        message: 'Order deleted successfully',
        messageAr: 'تم حذف الطلب بنجاح'
      });
    } catch (error) {
      const statusCode = error.message === 'Order not found' ? 404 : 400;
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Failed to delete order'
      });
    }
  }

  // Assign vehicle to order (Admin only)
  async assignVehicle(req, res) {
    try {
      const { vehicleId } = req.body;
      const order = await OrderService.assignVehicleToOrder(
        req.params.id, 
        vehicleId, 
        req.user.id
      );

      res.status(200).json({
        success: true,
        message: 'Vehicle assigned to order successfully',
        messageAr: 'تم تعيين المركبة للطلب بنجاح',
        data: order
      });
    } catch (error) {
      const statusCode = error.message.includes('not found') ? 404 : 400;
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Failed to assign vehicle'
      });
    }
  }

  // Unassign vehicle from order (Admin only)
  async unassignVehicle(req, res) {
    try {
      const order = await OrderService.unassignVehicleFromOrder(req.params.id);

      res.status(200).json({
        success: true,
        message: 'Vehicle unassigned from order successfully',
        messageAr: 'تم إلغاء تعيين المركبة من الطلب بنجاح',
        data: order
      });
    } catch (error) {
      const statusCode = error.message === 'Order not found' ? 404 : 400;
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Failed to unassign vehicle'
      });
    }
  }

  // Update order status
  async updateOrderStatus(req, res) {
    try {
      const { status } = req.body;
      const order = await OrderService.updateOrderStatus(req.params.id, status);

      res.status(200).json({
        success: true,
        message: 'Order status updated successfully',
        messageAr: 'تم تحديث حالة الطلب بنجاح',
        data: order
      });
    } catch (error) {
      const statusCode = error.message === 'Order not found' ? 404 : 400;
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Failed to update order status'
      });
    }
  }

  // Get available vehicles
  async getAvailableVehicles(req, res) {
    try {
      const vehicles = await OrderService.getAvailableVehicles();

      res.status(200).json({
        success: true,
        message: 'Available vehicles retrieved successfully',
        messageAr: 'تم استرجاع المركبات المتاحة بنجاح',
        data: vehicles
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get available vehicles'
      });
    }
  }

  // Get orders by merchant (for merchant dashboard)
  async getMyOrders(req, res) {
    try {
      const options = {
        page: req.query.page,
        limit: req.query.limit,
        status: req.query.status
      };

      const orders = await OrderService.getOrdersByMerchant(req.user.id, options);

      res.status(200).json({
        success: true,
        message: 'Your orders retrieved successfully',
        messageAr: 'تم استرجاع طلباتك بنجاح',
        data: orders
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get your orders'
      });
    }
  }

  // Get orders by driver (for driver dashboard)
  async getMyDeliveries(req, res) {
    try {
      const options = {
        status: req.query.status
      };

      const orders = await OrderService.getOrdersByDriver(req.user.id, options);

      res.status(200).json({
        success: true,
        message: 'Your deliveries retrieved successfully',
        messageAr: 'تم استرجاع توصيلاتك بنجاح',
        data: orders
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get your deliveries'
      });
    }
  }

  // Get order statistics (Admin only)
  async getOrderStatistics(req, res) {
    try {
      const statistics = await OrderService.getOrderStatistics();

      res.status(200).json({
        success: true,
        message: 'Order statistics retrieved successfully',
        messageAr: 'تم استرجاع إحصائيات الطلبات بنجاح',
        data: statistics
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get order statistics'
      });
    }
  }
  async getOrdersAdvancedFilter(req, res) {
  try {
    const filters = req.query;
    const orders = await OrderService.getOrdersWithAdvancedFilter(filters);
    
    res.status(200).json({
      success: true,
      message: 'Orders filtered successfully',
      messageAr: 'تم تصفية الطلبات بنجاح',
      data: {
        orders,
        total: orders.length,
        filters: filters
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to filter orders'
    });
  }
}

// Bulk driver assignment
async assignBulkDriver(req, res) {
  try {
    const { orderIds, driverId, vehicleId } = req.body;
    const result = await OrderService.assignBulkDriver(
      orderIds, 
      driverId, 
      vehicleId,
      req.user.id
    );
    
    res.status(200).json({
      success: true,
      message: `${result.assignedCount} orders assigned to driver successfully`,
      messageAr: `تم تعيين ${result.assignedCount} طلبات للسائق بنجاح`,
      data: result
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to assign orders to driver'
    });
  }
}

// Bulk outsource assignment
async assignBulkOutsource(req, res) {
  try {
    const { orderIds, outsourceId, commissionRate } = req.body;
    const result = await OrderService.assignBulkOutsource(
      orderIds,
      outsourceId, 
      req.user.id,
      commissionRate
    );
    
    res.status(200).json({
      success: true,
      message: `${result.assignedCount} orders assigned to outsource successfully`,
      messageAr: `تم تعيين ${result.assignedCount} طلبات للشريك الخارجي بنجاح`,
      data: result
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to assign orders to outsource'
    });
  }
}

// Bulk unassignment
async unassignBulkOrders(req, res) {
  try {
    const { orderIds } = req.body;
    const result = await OrderService.unassignBulkOrders(orderIds);
    
    res.status(200).json({
      success: true,
      message: `${result.unassignedCount} orders unassigned successfully`,
      messageAr: `تم إلغاء تعيين ${result.unassignedCount} طلبات بنجاح`,
      data: result
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to unassign orders'
    });
  }
}

// Get available drivers
async getAvailableDrivers(req, res) {
  try {
    const drivers = await OrderService.getAvailableDrivers();
    
    res.status(200).json({
      success: true,
      message: 'Available drivers retrieved successfully',
      messageAr: 'تم استرجاع السائقين المتاحين بنجاح',
      data: drivers
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get available drivers'
    });
  }
}

// Get available outsource partners
async getAvailableOutsource(req, res) {
  try {
    const outsource = await OrderService.getAvailableOutsource();
    
    res.status(200).json({
      success: true,
      message: 'Available outsource partners retrieved successfully',
      messageAr: 'تم استرجاع الشركاء الخارجيين المتاحين بنجاح',
      data: outsource
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get available outsource partners'
    });
  }
}

// Get geographic statistics
async getGeographicStatistics(req, res) {
  try {
    const statistics = await OrderService.getGeographicStatistics();
    
    res.status(200).json({
      success: true,
      message: 'Geographic statistics retrieved successfully',
      messageAr: 'تم استرجاع الإحصائيات الجغرافية بنجاح',
      data: statistics
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get geographic statistics'
    });
  }
}

async trackOrder(req, res) {
  try {
    const { trackingNumber } = req.params;
    
    const orderData = await OrderService.getOrderByTrackingNumber(trackingNumber);
    
    res.status(200).json({
      success: true,
      message: 'Order tracking information retrieved successfully',
      messageAr: 'تم استرجاع معلومات تتبع الطلب بنجاح',
      data: orderData
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      message: error.message || 'Order not found',
      messageAr: 'الطلب غير موجود'
    });
  }
}
  async assignDriver(req, res) {
    try {
      const { id } = req.params;
      const { driverId, vehicleId } = req.body;
      const assignedBy = req.user.id;
      
      const result = await OrderService.assignBulkDriver([id], driverId, vehicleId, assignedBy);
      
      return res.status(200).json({
        success: true,
        message: 'Order assigned to driver successfully',
        messageAr: 'تم تكليف الطلب للسائق بنجاح',
        data: result
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message,
        messageAr: error.messageAr || 'فشل في تكليف الطلب'
      });
    }
  }

  // Unassign order
  async unassignOrder(req, res) {
    try {
      const { id } = req.params;
      
      const result = await OrderService.unassignBulkOrders([id]);
      
      return res.status(200).json({
        success: true,
        message: 'Order unassigned successfully',
        messageAr: 'تم إلغاء تكليف الطلب بنجاح',
        data: result
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message,
        messageAr: 'فشل في إلغاء التكليف'
      });
    }
  }

    async updateStatusAndAssign(req, res) {
    try {
      const { id } = req.params;
      const { status, driverId, vehicleId } = req.body;
      const assignedBy = req.user.id;
      
      // If driver assignment is requested, assign first
      if (driverId) {
        await OrderService.assignBulkDriver([id], driverId, vehicleId, assignedBy);
      }
      
      // Then update status
      const result = await OrderService.updateOrderStatus(id, status);
      
      return res.status(200).json({
        success: true,
        message: 'Order status updated and assigned successfully',
        messageAr: 'تم تحديث حالة الطلب والتكليف بنجاح',
        data: result
      });
    } catch (error) {
      console.error('Error updating status and assigning order:', error);
      return res.status(400).json({
        success: false,
        message: error.message || 'Failed to update status and assign order',
        messageAr: 'فشل في تحديث الحالة والتكليف'
      });
    }
  }


}



module.exports = new OrderController();