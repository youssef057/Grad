const RouteService = require('./service');

class RouteController {
  /**
   * Get driver's picked up orders
   */
  async getDriverOrders(req, res) {
    try {
      const { driverId } = req.params;
      
      const result = await RouteService.getDriverPickedUpOrders(driverId);
      
      return res.status(200).json({
        success: true,
        message: 'Driver orders retrieved successfully',
        messageAr: 'تم استرجاع طلبات السائق بنجاح',
        data: result.data,
        count: result.count
      });
    } catch (error) {
      console.error('Error in getDriverOrders:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to get driver orders',
        messageAr: 'فشل في استرجاع طلبات السائق'
      });
    }
  }

  /**
   * Optimize route for driver
   */
  async optimizeDriverRoute(req, res) {
    try {
      const { driverId } = req.params;
      const { forceRecalculate, includeTraffic } = req.body;
      
      const result = await RouteService.optimizeRoute(driverId, {
        forceRecalculate,
        includeTraffic
      });
      
      if (!result.success) {
        return res.status(400).json(result);
      }
      
      return res.status(200).json(result);
    } catch (error) {
      console.error('Error in optimizeDriverRoute:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to optimize route',
        messageAr: 'فشل في تحسين المسار'
      });
    }
  }

  /**
   * Get current optimized route
   */
  async getCurrentRoute(req, res) {
    try {
      const { driverId } = req.params;
      
      const result = await RouteService.getCurrentRoute(driverId);
      
      return res.status(200).json(result);
    } catch (error) {
      console.error('Error in getCurrentRoute:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to get current route',
        messageAr: 'فشل في استرجاع المسار الحالي'
      });
    }
  }

  /**
   * Update order delivery status
   */
  async updateOrderStatus(req, res) {
    try {
      const { driverId } = req.params;
      const { orderId, status, deliveryNotes } = req.body;
      
      // TODO: Implement order status update
      return res.status(501).json({
        success: false,
        message: 'Order status update not implemented yet',
        messageAr: 'تحديث حالة الطلب لم يتم تنفيذه بعد'
      });
    } catch (error) {
      console.error('Error in updateOrderStatus:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to update order status',
        messageAr: 'فشل في تحديث حالة الطلب'
      });
    }
  }

  /**
   * Admin: Get all driver routes - FIXED!
   */
  async getAllDriverRoutes(req, res) {
    try {
      const result = await RouteService.getAllDriverRoutes();
      
      return res.status(200).json(result);
    } catch (error) {
      console.error('Error in getAllDriverRoutes:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to get all routes',
        messageAr: 'فشل في استرجاع جميع المسارات'
      });
    }
  }

  /**
   * Admin: Get geocaching statistics
   */
  async getGeocacheStats(req, res) {
    try {
      const result = await RouteService.getGeocacheStats();
      
      return res.status(200).json({
        success: true,
        message: 'Geocache statistics retrieved successfully',
        messageAr: 'تم استرجاع إحصائيات ذاكرة التخزين المؤقت بنجاح',
        data: result.data
      });
    } catch (error) {
      console.error('Error in getGeocacheStats:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to get geocache stats',
        messageAr: 'فشل في استرجاع إحصائيات ذاكرة التخزين المؤقت'
      });
    }
  }

  /**
   * Admin: Clear geocache
   */
  async clearGeocache(req, res) {
    try {
      const result = await RouteService.clearGeocache();
      
      return res.status(200).json(result);
    } catch (error) {
      console.error('Error in clearGeocache:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to clear geocache',
        messageAr: 'فشل في مسح ذاكرة التخزين المؤقت'
      });
    }
  }
}

module.exports = new RouteController();