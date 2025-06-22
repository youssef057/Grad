const { PrismaClient } = require('@prisma/client');
const { BUSINESS_RULES, ERROR_MESSAGES_AR } = require('../../config/constants');
const prisma = new PrismaClient();

class SystemConfigService {
  // Helper function to format Arabic error messages with placeholders
  formatArabicMessage(template, replacements = {}) {
    let message = template;
    Object.keys(replacements).forEach(key => {
      message = message.replace(`{${key}}`, replacements[key]);
    });
    return message;
  }

  // Get configuration value with fallback
  async getConfigValue(key, defaultValue = null) {
    try {
      const config = await prisma.systemConfig.findUnique({
        where: { configKey: key }
      });
      
      return config ? config.configValue : defaultValue;
    } catch (error) {
      console.error('Error getting config value:', error);
      return defaultValue;
    }
  }

  // Set configuration value with Arabic description support
  async setConfigValue(key, value, description, descriptionAr, updatedBy) {
    try {
      return await prisma.systemConfig.upsert({
        where: { configKey: key },
        update: {
          configValue: value.toString(),
          description,
          descriptionAr,
          updatedBy,
          updatedAt: new Date()
        },
        create: {
          configKey: key,
          configValue: value.toString(),
          description,
          descriptionAr,
          updatedBy
        }
      });
    } catch (error) {
      console.error('Error setting config value:', error);
      const error_ar = new Error('Failed to update system configuration');
      error_ar.messageAr = ERROR_MESSAGES_AR.SYSTEM_CONFIG_UPDATE_FAILED;
      throw error_ar;
    }
  }

  // Get max orders per driver (admin configurable)
  async getMaxOrdersPerDriver() {
    const value = await this.getConfigValue(
      'MAX_ORDERS_PER_DRIVER', 
      BUSINESS_RULES.DEFAULT_MAX_ORDERS_PER_DRIVER
    );
    return parseInt(value);
  }

  // Update max orders per driver with Arabic validation
  async updateMaxOrdersPerDriver(newValue, updatedBy) {
    const min = BUSINESS_RULES.MIN_ORDERS_PER_DRIVER;
    const max = BUSINESS_RULES.MAX_ORDERS_PER_DRIVER;
    
    if (newValue < min || newValue > max) {
      const errorMessageAr = this.formatArabicMessage(ERROR_MESSAGES_AR.MAX_ORDERS_OUT_OF_RANGE, {
        min: min,
        max: max
      });
      
      const error = new Error(`Max orders per driver must be between ${min} and ${max}`);
      error.messageAr = errorMessageAr;
      throw error;
    }

    return await this.setConfigValue(
      'MAX_ORDERS_PER_DRIVER',
      newValue,
      'Maximum orders that can be assigned to a single driver',
      'الحد الأقصى للطلبات التي يمكن تعيينها لسائق واحد',
      updatedBy
    );
  }

  // Get all system configurations with Arabic support
  async getAllConfigs() {
    try {
      return await prisma.systemConfig.findMany({
        include: {
          updatedByUser: {
            select: {
              firstName: true,
              lastName: true,
              fullName: true
            }
          }
        },
        orderBy: { configKey: 'asc' }
      });
    } catch (error) {
      console.error('Error getting all configs:', error);
      const error_ar = new Error('Failed to fetch system configurations');
      error_ar.messageAr = 'فشل في استرجاع إعدادات النظام';
      throw error_ar;
    }
  }
}

module.exports = new SystemConfigService();