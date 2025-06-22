const SystemConfigService = require('./service');

class SystemConfigController {
  // Get max orders per driver
  async getMaxOrdersPerDriver(req, res) {
    try {
      const maxOrders = await SystemConfigService.getMaxOrdersPerDriver();
      
      res.status(200).json({
        success: true,
        message: 'Max orders per driver retrieved successfully',
        messageAr: 'تم استرجاع الحد الأقصى للطلبات لكل سائق بنجاح',
        data: { 
          maxOrdersPerDriver: maxOrders,
          configKey: 'MAX_ORDERS_PER_DRIVER'
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get max orders per driver',
        messageAr: error.messageAr || 'فشل في استرجاع الحد الأقصى للطلبات لكل سائق'
      });
    }
  }

  // Update max orders per driver
  async updateMaxOrdersPerDriver(req, res) {
    try {
      const { maxOrders } = req.body;
      const config = await SystemConfigService.updateMaxOrdersPerDriver(maxOrders, req.user.id);
      
      res.status(200).json({
        success: true,
        message: 'Max orders per driver updated successfully',
        messageAr: 'تم تحديث الحد الأقصى للطلبات لكل سائق بنجاح',
        data: {
          configKey: config.configKey,
          configValue: config.configValue,
          description: config.description,
          descriptionAr: config.descriptionAr,
          updatedAt: config.updatedAt
        }
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to update max orders per driver',
        messageAr: error.messageAr || 'فشل في تحديث الحد الأقصى للطلبات لكل سائق'
      });
    }
  }

  // Get all system configurations
  async getAllConfigs(req, res) {
    try {
      const configs = await SystemConfigService.getAllConfigs();
      
      res.status(200).json({
        success: true,
        message: 'System configurations retrieved successfully',
        messageAr: 'تم استرجاع إعدادات النظام بنجاح',
        data: {
          configs,
          total: configs.length
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get system configurations',
        messageAr: error.messageAr || 'فشل في استرجاع إعدادات النظام'
      });
    }
  }

  // Get specific configuration value
  async getConfigValue(req, res) {
    try {
      const { key } = req.params;
      const value = await SystemConfigService.getConfigValue(key);
      
      if (value === null) {
        return res.status(404).json({
          success: false,
          message: `Configuration key '${key}' not found`,
          messageAr: `مفتاح التكوين '${key}' غير موجود`
        });
      }
      
      res.status(200).json({
        success: true,
        message: 'Configuration value retrieved successfully',
        messageAr: 'تم استرجاع قيمة التكوين بنجاح',
        data: {
          configKey: key,
          configValue: value
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get configuration value',
        messageAr: error.messageAr || 'فشل في استرجاع قيمة التكوين'
      });
    }
  }
}

module.exports = new SystemConfigController();