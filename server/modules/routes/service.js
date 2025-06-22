const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Import advanced route utilities
const RouteOptimizer = require('./utils/optimizer');
const RouteBuilder = require('./utils/route-builder');
const Geocoder = require('./utils/geocoder');
const DistanceMatrix = require('./utils/distance-matrix');

class RouteService {
  constructor() {
    // Initialize in-memory cache as backup
    this.routeCache = new Map();
  }

  /**
   * Get all PICKED_UP orders for a specific driver
   */
  async getDriverPickedUpOrders(driverId) {
    try {
      const orders = await prisma.order.findMany({
        where: {
          driverId: driverId,
          status: 'PICKED_UP'
        },
        include: {
          merchant: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              fullName: true,
              companyName: true,
              phone: true
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
          vehicle: {
            select: {
              id: true,
              name: true,
              nameAr: true,
              vehicleNumber: true,
              type: true,
              status: true,
              maxUnits: true
            }
          }
        },
        orderBy: [
          { priority: 'desc' },
          { createdAt: 'asc' }
        ]
      });

      return {
        success: true,
        data: orders,
        count: orders.length
      };
    } catch (error) {
      console.error('Error getting driver orders:', error);
      throw new Error(`Failed to get driver orders: ${error.message}`);
    }
  }

  /**
   * Get current optimized route for driver with persistent state
   */
  async getCurrentRoute(driverId) {
    try {
      // Get orders
      const ordersResult = await this.getDriverPickedUpOrders(driverId);
      
      // Get optimization state from database
      const optimizationState = await prisma.routeOptimization.findUnique({
        where: { driverId }
      });
      
      return {
        success: true,
        message: 'Current route retrieved',
        messageAr: 'تم استرجاع المسار الحالي',
        data: {
          driverId: driverId,
          routeOptimized: optimizationState?.routeOptimized || false,
          totalOrders: ordersResult.count,
          orders: ordersResult.data,
          optimizedAt: optimizationState?.optimizedAt || null,
          estimatedDuration: optimizationState?.estimatedDuration || null,
          estimatedDistance: optimizationState?.estimatedDistance || null,
          optimizationData: optimizationState?.optimizationData || null
        }
      };
    } catch (error) {
      console.error('Error getting current route:', error);
      throw new Error('Failed to get current route');
    }
  }

  /**
   * ENHANCED: Optimize route using advanced algorithms
   */
  async optimizeRoute(driverId, options = {}) {
    try {
      const { 
        forceRecalculate = false, 
        includeTraffic = false,
        algorithm = 'HYBRID',
        useGoogleMaps = true 
      } = options;
      
      console.log(`Optimizing route for driver ${driverId} with algorithm: ${algorithm}`);
      
      // Get driver's picked up orders
      const ordersResult = await this.getDriverPickedUpOrders(driverId);
      
      if (ordersResult.count === 0) {
        return {
          success: false,
          message: 'No picked up orders found for driver',
          messageAr: 'لا توجد طلبات محملة للسائق',
          data: null
        };
      }

      // Check if optimization already exists and force recalculate is false
      if (!forceRecalculate) {
        const existingOptimization = await prisma.routeOptimization.findUnique({
          where: { driverId }
        });
        
        if (existingOptimization?.routeOptimized) {
          return {
            success: true,
            message: 'Route already optimized (use forceRecalculate=true to recalculate)',
            messageAr: 'المسار محسن بالفعل',
            data: {
              driverId: driverId,
              routeOptimized: true,
              totalOrders: ordersResult.count,
              optimizedAt: existingOptimization.optimizedAt,
              estimatedDuration: existingOptimization.estimatedDuration,
              estimatedDistance: existingOptimization.estimatedDistance,
              fromCache: true
            }
          };
        }
      }

      let optimizationResult;
      
      if (useGoogleMaps && ordersResult.count > 1) {
        // Use advanced optimization with Google Maps
        console.log('Using advanced Google Maps optimization');
        
        try {
          optimizationResult = await RouteOptimizer.optimizeRoute(ordersResult.data, {
            algorithm,
            includeTraffic,
            vehicleCapacity: ordersResult.data[0]?.vehicle?.maxUnits || null
          });
        } catch (error) {
          console.warn('Advanced optimization failed, falling back to basic:', error.message);
          optimizationResult = this.applyBasicOptimizationAlgorithm(ordersResult.data, options);
        }
      } else {
        // Use basic priority-based optimization
        console.log('Using basic priority-based optimization');
        optimizationResult = this.applyBasicOptimizationAlgorithm(ordersResult.data, options);
      }

      // Extract metrics from optimization result
      const totalOrders = optimizationResult.totalOrders || ordersResult.count;
      const estimatedDuration = optimizationResult.estimatedDuration || `${totalOrders * 15} minutes`;
      const estimatedDistance = optimizationResult.estimatedDistance || `${totalOrders * 5} km`;
      const optimizedAt = new Date();
      const optimizationMethod = optimizationResult.algorithm || (includeTraffic ? 'PRIORITY_TRAFFIC_BASED' : 'PRIORITY_BASED');

      // Save optimization state to database
      await prisma.routeOptimization.upsert({
        where: { driverId },
        create: {
          driverId,
          routeOptimized: true,
          optimizedAt,
          estimatedDuration,
          estimatedDistance,
          optimizationData: {
            method: optimizationMethod,
            forceRecalculate: forceRecalculate,
            includeTraffic: includeTraffic,
            useGoogleMaps: useGoogleMaps,
            totalOrders: totalOrders,
            optimizationTimestamp: optimizedAt.toISOString(),
            realDistanceCalculated: optimizationResult.realDistanceCalculated || false,
            ...optimizationResult.metadata
          }
        },
        update: {
          routeOptimized: true,
          optimizedAt,
          estimatedDuration,
          estimatedDistance,
          optimizationData: {
            method: optimizationMethod,
            forceRecalculate: forceRecalculate,
            includeTraffic: includeTraffic,
            useGoogleMaps: useGoogleMaps,
            totalOrders: totalOrders,
            optimizationTimestamp: optimizedAt.toISOString(),
            realDistanceCalculated: optimizationResult.realDistanceCalculated || false,
            ...optimizationResult.metadata
          }
        }
      });

      return {
        success: true,
        message: 'Route optimized successfully',
        messageAr: 'تم تحسين المسار بنجاح',
        data: {
          driverId: driverId,
          routeOptimized: true,
          totalOrders: totalOrders,
          optimizedSequence: optimizationResult.optimizedSequence || optimizationResult.data,
          optimizedAt: optimizedAt,
          estimatedDuration: estimatedDuration,
          estimatedDistance: estimatedDistance,
          optimizationMethod: optimizationMethod,
          includeTraffic: includeTraffic,
          realDistanceCalculated: optimizationResult.realDistanceCalculated || false,
          estimatedImprovement: optimizationResult.metadata?.estimatedImprovement || '0%'
        }
      };
    } catch (error) {
      console.error('Error optimizing route:', error);
      throw new Error(`Failed to optimize route: ${error.message}`);
    }
  }

  /**
   * NEW: Build complete driver route with navigation
   */
  async buildDriverRoute(driverId, options = {}) {
    try {
      const {
        algorithm = 'HYBRID',
        includeTraffic = true,
        includeDirections = true,
        generateMapUrl = true
      } = options;

      console.log(`Building complete route for driver ${driverId}`);

      // Get driver's orders
      const ordersResult = await this.getDriverPickedUpOrders(driverId);
      
      if (ordersResult.count === 0) {
        return {
          success: false,
          message: 'No orders found for route building',
          messageAr: 'لا توجد طلبات لبناء المسار'
        };
      }

      // Build complete route with navigation
      const completeRoute = await RouteBuilder.buildDriverRoute(driverId, ordersResult.data, {
        algorithm,
        includeTraffic,
        includeDirections,
        generateMapUrl
      });

      return {
        success: true,
        message: 'Complete route built successfully',
        messageAr: 'تم بناء المسار الكامل بنجاح',
        data: completeRoute
      };

    } catch (error) {
      console.error('Error building driver route:', error);
      throw new Error(`Failed to build driver route: ${error.message}`);
    }
  }

  /**
   * NEW: Get driver map data for frontend
   */
  async getDriverMapData(driverId, options = {}) {
    try {
      const { includeTraffic = true } = options;

      // Get orders
      const ordersResult = await this.getDriverPickedUpOrders(driverId);
      
      if (ordersResult.count === 0) {
        return {
          success: false,
          message: 'No orders found for map generation',
          messageAr: 'لا توجد طلبات لإنشاء الخريطة'
        };
      }

      // Geocode all addresses
      const geocodedOrders = [];
      for (const order of ordersResult.data) {
        try {
          const coordinates = await Geocoder.geocodeAddress(order.deliveryAddress);
          geocodedOrders.push({
            ...order,
            coordinates: coordinates.isValid ? coordinates : null,
            geocoded: coordinates.isValid
          });
        } catch (error) {
          console.error(`Geocoding error for order ${order.id}:`, error);
          geocodedOrders.push({
            ...order,
            coordinates: null,
            geocoded: false
          });
        }
      }

      // Calculate distances if we have valid coordinates
      let distanceData = null;
      const validOrders = geocodedOrders.filter(order => order.geocoded);
      
      if (validOrders.length >= 2) {
        try {
          const deliveryPoints = validOrders.map(order => ({
            orderId: order.id,
            latitude: order.coordinates.latitude,
            longitude: order.coordinates.longitude,
            address: order.deliveryAddress
          }));

          distanceData = await DistanceMatrix.calculateDeliveryDistances(deliveryPoints);
        } catch (error) {
          console.warn('Distance calculation failed for map data:', error.message);
        }
      }

      return {
        success: true,
        message: 'Driver map data generated successfully',
        messageAr: 'تم إنشاء بيانات خريطة السائق بنجاح',
        data: {
          driverId,
          totalOrders: geocodedOrders.length,
          geocodedOrders: geocodedOrders.length,
          validCoordinates: validOrders.length,
          orders: geocodedOrders.map(order => ({
            id: order.id,
            orderNumber: order.orderNumber,
            customerName: order.customerName,
            deliveryAddress: order.deliveryAddress,
            deliveryArea: order.deliveryArea,
            priority: order.priority,
            coordinates: order.coordinates,
            geocoded: order.geocoded
          })),
          distanceMatrix: distanceData,
          mapBounds: this.calculateMapBounds(validOrders),
          centerPoint: this.calculateCenterPoint(validOrders)
        }
      };

    } catch (error) {
      console.error('Error generating driver map data:', error);
      throw new Error(`Failed to generate map data: ${error.message}`);
    }
  }

  /**
   * NEW: Validate Google Maps configuration
   */
  async validateGoogleMapsConfig() {
    try {
      console.log('Validating Google Maps configuration...');
      
      await Geocoder.validateApiKey();
      await DistanceMatrix.validateConfiguration();
      await RouteBuilder.validateConfiguration();

      return {
        success: true,
        message: 'Google Maps configuration is valid',
        messageAr: 'إعدادات خرائط جوجل صحيحة',
        data: {
          geocodingEnabled: true,
          distanceMatrixEnabled: true,
          directionsEnabled: true,
          validatedAt: new Date().toISOString()
        }
      };

    } catch (error) {
      console.error('Google Maps configuration validation failed:', error);
      
      return {
        success: false,
        message: `Google Maps configuration invalid: ${error.message}`,
        messageAr: 'إعدادات خرائط جوجل غير صحيحة',
        data: {
          geocodingEnabled: false,
          distanceMatrixEnabled: false,
          directionsEnabled: false,
          error: error.message
        }
      };
    }
  }

  /**
   * Basic optimization algorithm (fallback)
   */
  applyBasicOptimizationAlgorithm(orders, options = {}) {
    const { includeTraffic = false } = options;
    
    // Sort by priority first (URGENT > HIGH > NORMAL > LOW)
    const optimizedOrders = orders.sort((a, b) => {
      const priorityOrder = { 'URGENT': 4, 'HIGH': 3, 'NORMAL': 2, 'LOW': 1 };
      
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      }
      
      // Then by creation time (older first)
      return new Date(a.createdAt) - new Date(b.createdAt);
    });

    // Add sequence numbers for frontend
    const optimizedSequence = optimizedOrders.map((order, index) => ({
      ...order,
      sequenceNumber: index + 1,
      estimatedDeliveryTime: `${(index + 1) * 15} minutes`
    }));

    return {
      success: true,
      algorithm: 'PRIORITY_BASED',
      totalOrders: optimizedOrders.length,
      optimizedSequence,
      estimatedDuration: `${optimizedOrders.length * 15} minutes`,
      estimatedDistance: `${optimizedOrders.length * 5} km`,
      realDistanceCalculated: false,
      metadata: {
        estimatedImprovement: '0%',
        optimizationVersion: '1.0.0',
        fallback: true
      }
    };
  }

  /**
   * Calculate map bounds for frontend map display
   */
  calculateMapBounds(orders) {
    if (orders.length === 0) return null;

    const validOrders = orders.filter(order => order.coordinates);
    if (validOrders.length === 0) return null;

    let minLat = validOrders[0].coordinates.latitude;
    let maxLat = validOrders[0].coordinates.latitude;
    let minLng = validOrders[0].coordinates.longitude;
    let maxLng = validOrders[0].coordinates.longitude;

    validOrders.forEach(order => {
      const { latitude, longitude } = order.coordinates;
      minLat = Math.min(minLat, latitude);
      maxLat = Math.max(maxLat, latitude);
      minLng = Math.min(minLng, longitude);
      maxLng = Math.max(maxLng, longitude);
    });

    return {
      southwest: { latitude: minLat, longitude: minLng },
      northeast: { latitude: maxLat, longitude: maxLng }
    };
  }

  /**
   * Calculate center point for map display
   */
  calculateCenterPoint(orders) {
    if (orders.length === 0) return null;

    const validOrders = orders.filter(order => order.coordinates);
    if (validOrders.length === 0) return null;

    const totalLat = validOrders.reduce((sum, order) => sum + order.coordinates.latitude, 0);
    const totalLng = validOrders.reduce((sum, order) => sum + order.coordinates.longitude, 0);

    return {
      latitude: totalLat / validOrders.length,
      longitude: totalLng / validOrders.length
    };
  }

  /**
   * Clear route optimization for driver
   */
  async clearRouteOptimization(driverId) {
    try {
      await prisma.routeOptimization.delete({
        where: { driverId }
      });

      return {
        success: true,
        message: 'Route optimization cleared',
        messageAr: 'تم مسح تحسين المسار'
      };
    } catch (error) {
      // If no optimization exists, that's fine
      if (error.code === 'P2025') {
        return {
          success: true,
          message: 'No route optimization to clear',
          messageAr: 'لا يوجد تحسين مسار لمسحه'
        };
      }
      
      console.error('Error clearing route optimization:', error);
      throw new Error('Failed to clear route optimization');
    }
  }

  /**
   * Get all driver routes overview (Admin) - ENHANCED
   */
  async getAllDriverRoutes() {
    try {
      // Get all drivers who have PICKED_UP orders
      const driversWithOrders = await prisma.user.findMany({
        where: {
          role: 'DRIVER',
          driverOrders: {
            some: {
              status: 'PICKED_UP'
            }
          }
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          fullName: true,
          phone: true,
          driverOrders: {
            where: {
              status: 'PICKED_UP'
            },
            select: {
              id: true,
              orderNumber: true,
              customerName: true,
              deliveryAddress: true,
              deliveryArea: true,
              priority: true,
              createdAt: true,
              assignedAt: true
            },
            orderBy: [
              { priority: 'desc' },
              { createdAt: 'asc' }
            ]
          }
        }
      });

      // Get optimization states for all drivers
      const optimizationStates = await prisma.routeOptimization.findMany({
        where: {
          driverId: {
            in: driversWithOrders.map(driver => driver.id)
          }
        }
      });

      // Create optimization lookup map
      const optimizationMap = new Map();
      optimizationStates.forEach(state => {
        optimizationMap.set(state.driverId, state);
      });

      // Process each driver's route data
      const routeOverview = driversWithOrders.map(driver => {
        const totalOrders = driver.driverOrders.length;
        const optimizationState = optimizationMap.get(driver.id);
        
        return {
          driverId: driver.id,
          driverName: driver.fullName || `${driver.firstName} ${driver.lastName}`,
          driverPhone: driver.phone,
          totalOrders: totalOrders,
          routeOptimized: optimizationState?.routeOptimized || false,
          lastOptimizedAt: optimizationState?.optimizedAt || null,
          estimatedDuration: optimizationState?.estimatedDuration || `${totalOrders * 15} minutes`,
          estimatedDistance: optimizationState?.estimatedDistance || `${totalOrders * 5} km`,
          optimizationMethod: optimizationState?.optimizationData?.method || 'NONE',
          realDistanceCalculated: optimizationState?.optimizationData?.realDistanceCalculated || false,
          orders: driver.driverOrders.map(order => ({
            id: order.id,
            orderNumber: order.orderNumber,
            customerName: order.customerName,
            deliveryAddress: order.deliveryAddress,
            deliveryArea: order.deliveryArea,
            priority: order.priority,
            assignedAt: order.assignedAt
          }))
        };
      });

      // Enhanced summary statistics
      const totalDrivers = routeOverview.length;
      const totalOrders = routeOverview.reduce((sum, driver) => sum + driver.totalOrders, 0);
      const totalOptimizedRoutes = routeOverview.filter(driver => driver.routeOptimized).length;
      const totalAdvancedOptimizedRoutes = routeOverview.filter(driver => driver.realDistanceCalculated).length;

      return {
        success: true,
        message: 'All driver routes retrieved successfully',
        messageAr: 'تم استرجاع جميع مسارات السائقين بنجاح',
        data: routeOverview,
        summary: {
          totalDrivers: totalDrivers,
          totalOrders: totalOrders,
          totalOptimizedRoutes: totalOptimizedRoutes,
          totalUnoptimizedRoutes: totalDrivers - totalOptimizedRoutes,
          totalAdvancedOptimizedRoutes: totalAdvancedOptimizedRoutes,
          advancedOptimizationRate: totalDrivers > 0 ? `${((totalAdvancedOptimizedRoutes / totalDrivers) * 100).toFixed(1)}%` : '0%'
        }
      };

    } catch (error) {
      console.error('Error getting all driver routes:', error);
      throw new Error(`Failed to get driver routes: ${error.message}`);
    }
  }

  /**
   * Get geocache statistics - ENHANCED
   */
  async getGeocacheStats() {
    try {
      const stats = await Geocoder.getGeocacheStats();
      
      return {
        success: true,
        data: stats
      };
    } catch (error) {
      console.error('Error getting geocache stats:', error);
      throw new Error(`Failed to get geocache statistics: ${error.message}`);
    }
  }

  /**
   * Clear geocache (admin only)
   */
  async clearGeocache() {
    try {
      const result = await prisma.addressGeoCache.deleteMany({});
      
      return {
        success: true,
        message: 'Geocache cleared successfully',
        messageAr: 'تم مسح ذاكرة التخزين المؤقت بنجاح',
        data: {
          deletedCount: result.count
        }
      };
    } catch (error) {
      console.error('Error clearing geocache:', error);
      throw new Error('Failed to clear geocache');
    }
  }
}

module.exports = new RouteService();