const Geocoder = require('./geocoder');
const DistanceMatrix = require('./distance-matrix');
const RouteOptimizer = require('./optimizer');

class RouteBuilder {
  constructor() {
    this.googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY;
    this.directionsBaseUrl = 'https://maps.googleapis.com/maps/api/directions/json';
    this.region = process.env.GOOGLE_MAPS_REGION || 'EG';
    this.language = process.env.GOOGLE_MAPS_LANGUAGE || 'ar';
  }

  /**
   * Build complete route for a driver with navigation data
   */
  async buildDriverRoute(driverId, orders, options = {}) {
    try {
      const {
        algorithm = 'HYBRID',
        includeTraffic = true,
        includeDirections = true,
        vehicleCapacity = null,
        generateMapUrl = true
      } = options;

      console.log(`Building route for driver ${driverId} with ${orders.length} orders`);

      // Step 1: Optimize the route
      const optimizationResult = await RouteOptimizer.optimizeRoute(orders, {
        algorithm,
        includeTraffic,
        vehicleCapacity
      });

      if (!optimizationResult.success) {
        throw new Error('Route optimization failed');
      }

      // Step 2: Geocode all addresses if not already done
      const geocodedRoute = await this.geocodeRouteOrders(optimizationResult.optimizedSequence);

      // Step 3: Calculate detailed route information
      const routeDetails = await this.calculateRouteDetails(geocodedRoute, { includeTraffic });

      // Step 4: Generate turn-by-turn directions if requested
      let directions = null;
      if (includeDirections) {
        directions = await this.generateTurnByTurnDirections(geocodedRoute, { includeTraffic });
      }

      // Step 5: Generate map visualization URL
      let mapUrl = null;
      if (generateMapUrl) {
        mapUrl = this.generateMapUrl(geocodedRoute);
      }

      // Step 6: Build final route structure
      const finalRoute = this.buildFinalRouteStructure({
        driverId,
        optimizationResult,
        geocodedRoute,
        routeDetails,
        directions,
        mapUrl,
        options
      });

      return finalRoute;

    } catch (error) {
      console.error('Route building error:', error);
      throw new Error(`Failed to build driver route: ${error.message}`);
    }
  }

  /**
   * Geocode all orders in the optimized route
   */
  async geocodeRouteOrders(orders) {
    const geocodedOrders = [];

    for (const order of orders) {
      try {
        let coordinates = order.coordinates;

        // Geocode if coordinates are missing
        if (!coordinates || !coordinates.latitude || !coordinates.longitude) {
          coordinates = await Geocoder.geocodeAddress(order.deliveryAddress);
        }

        geocodedOrders.push({
          ...order,
          coordinates: coordinates.isValid ? coordinates : null,
          geocoded: coordinates.isValid,
          geocodingError: coordinates.isValid ? null : coordinates.error
        });

      } catch (error) {
        console.error(`Geocoding error for order ${order.id}:`, error);
        geocodedOrders.push({
          ...order,
          coordinates: null,
          geocoded: false,
          geocodingError: error.message
        });
      }
    }

    return geocodedOrders;
  }

  /**
   * Calculate detailed route information
   */
  async calculateRouteDetails(geocodedRoute, options = {}) {
    try {
      const validOrders = geocodedRoute.filter(order => order.geocoded);

      if (validOrders.length < 2) {
        return this.createBasicRouteDetails(geocodedRoute);
      }

      // Calculate distance matrix for the route
      const deliveryPoints = validOrders.map(order => ({
        orderId: order.id,
        latitude: order.coordinates.latitude,
        longitude: order.coordinates.longitude,
        address: order.deliveryAddress,
        priority: order.priority
      }));

      const distanceData = await DistanceMatrix.calculateDeliveryDistances(deliveryPoints);

      // Calculate route totals
      const routeTotals = this.calculateSequentialRouteTotals(validOrders, distanceData.distances);

      // Build detailed stops information
      const detailedStops = this.buildDetailedStops(geocodedRoute, distanceData.distances);

      return {
        ...routeTotals,
        detailedStops,
        geocodingSuccess: validOrders.length,
        geocodingTotal: geocodedRoute.length,
        geocodingRate: ((validOrders.length / geocodedRoute.length) * 100).toFixed(2) + '%',
        distanceMatrix: distanceData
      };

    } catch (error) {
      console.error('Route details calculation error:', error);
      return this.createBasicRouteDetails(geocodedRoute);
    }
  }

  /**
   * Calculate route totals following the optimized sequence
   */
  calculateSequentialRouteTotals(orders, distances) {
    let cumulativeDistance = 0;
    let cumulativeDuration = 0;
    let cumulativeDurationInTraffic = 0;
    const segments = [];

    for (let i = 0; i < orders.length - 1; i++) {
      const fromOrder = orders[i];
      const toOrder = orders[i + 1];

      const distanceInfo = distances.find(d => 
        d.fromOrderId === fromOrder.id && d.toOrderId === toOrder.id
      );

      if (distanceInfo) {
        cumulativeDistance += distanceInfo.distanceMeters;
        cumulativeDuration += distanceInfo.durationSeconds;
        cumulativeDurationInTraffic += distanceInfo.durationInTrafficSeconds;

        segments.push({
          from: {
            orderId: fromOrder.id,
            customerName: fromOrder.customerName,
            address: fromOrder.deliveryAddress
          },
          to: {
            orderId: toOrder.id,
            customerName: toOrder.customerName,
            address: toOrder.deliveryAddress
          },
          distance: distanceInfo.distanceText,
          duration: distanceInfo.durationText,
          durationInTraffic: distanceInfo.durationInTrafficText,
          segmentNumber: i + 1
        });
      }
    }

    return {
      totalDistanceMeters: cumulativeDistance,
      totalDistanceKm: (cumulativeDistance / 1000).toFixed(2),
      totalDurationSeconds: cumulativeDuration,
      totalDurationMinutes: Math.ceil(cumulativeDuration / 60),
      totalDurationInTrafficSeconds: cumulativeDurationInTraffic,
      totalDurationInTrafficMinutes: Math.ceil(cumulativeDurationInTraffic / 60),
      totalDurationText: this.formatDuration(cumulativeDuration),
      totalDurationInTrafficText: this.formatDuration(cumulativeDurationInTraffic),
      routeSegments: segments
    };
  }

  /**
   * Build detailed stops with cumulative timing
   */
  buildDetailedStops(orders, distances) {
    const stops = [];
    let cumulativeTime = 0;
    const deliveryTimeMinutes = 10; // Estimated time per delivery

    orders.forEach((order, index) => {
      // Calculate travel time to this stop
      let travelTimeToStop = 0;
      if (index > 0) {
        const previousOrder = orders[index - 1];
        const distanceInfo = distances.find(d => 
          d.fromOrderId === previousOrder.id && d.toOrderId === order.id
        );
        if (distanceInfo) {
          travelTimeToStop = Math.ceil(distanceInfo.durationInTrafficSeconds / 60);
        }
      }

      cumulativeTime += travelTimeToStop;

      stops.push({
        stopNumber: index + 1,
        orderId: order.id,
        orderNumber: order.orderNumber,
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        deliveryAddress: order.deliveryAddress,
        deliveryArea: order.deliveryArea,
        priority: order.priority,
        packageDescription: order.packageDescription,
        coordinates: order.coordinates,
        geocoded: order.geocoded,
        estimatedArrivalTime: `${cumulativeTime} minutes from start`,
        estimatedArrivalMinutes: cumulativeTime,
        travelTimeFromPrevious: travelTimeToStop,
        deliveryTimeEstimate: deliveryTimeMinutes,
        specialInstructions: order.specialInstructions,
        paymentMethod: order.paymentMethod,
        totalAmount: order.totalAmount
      });

      // Add delivery time for next calculation
      cumulativeTime += deliveryTimeMinutes;
    });

    return stops;
  }

  /**
   * Generate turn-by-turn directions using Google Directions API
   */
  async generateTurnByTurnDirections(geocodedRoute, options = {}) {
    try {
      const validOrders = geocodedRoute.filter(order => order.geocoded);

      if (validOrders.length < 2) {
        return {
          available: false,
          reason: 'Need at least 2 valid addresses for directions'
        };
      }

      // Build waypoints for Google Directions API
      const origin = `${validOrders[0].coordinates.latitude},${validOrders[0].coordinates.longitude}`;
      const destination = `${validOrders[validOrders.length - 1].coordinates.latitude},${validOrders[validOrders.length - 1].coordinates.longitude}`;
      
      let waypoints = '';
      if (validOrders.length > 2) {
        const waypointCoords = validOrders.slice(1, -1).map(order => 
          `${order.coordinates.latitude},${order.coordinates.longitude}`
        );
        waypoints = waypointCoords.join('|');
      }

      // Build API URL
      const url = new URL(this.directionsBaseUrl);
      url.searchParams.append('origin', origin);
      url.searchParams.append('destination', destination);
      if (waypoints) url.searchParams.append('waypoints', `optimize:false|${waypoints}`);
      url.searchParams.append('mode', 'driving');
      url.searchParams.append('language', this.language);
      url.searchParams.append('region', this.region);
      url.searchParams.append('key', this.googleMapsApiKey);

      if (options.includeTraffic) {
        url.searchParams.append('departure_time', 'now');
        url.searchParams.append('traffic_model', 'best_guess');
      }

      const response = await fetch(url.toString());
      const data = await response.json();

      if (data.status === 'OK' && data.routes.length > 0) {
        return this.processDirectionsResponse(data, validOrders);
      } else {
        throw new Error(`Directions API error: ${data.status}`);
      }

    } catch (error) {
      console.error('Turn-by-turn directions error:', error);
      return {
        available: false,
        reason: error.message,
        error: true
      };
    }
  }

  /**
   * Process Google Directions API response
   */
  processDirectionsResponse(directionsData, orders) {
    const route = directionsData.routes[0];
    const legs = route.legs;

    const directions = {
      available: true,
      overview: {
        totalDistance: route.legs.reduce((sum, leg) => sum + leg.distance.value, 0),
        totalDuration: route.legs.reduce((sum, leg) => sum + leg.duration.value, 0),
        totalDurationInTraffic: route.legs.reduce((sum, leg) => sum + (leg.duration_in_traffic?.value || leg.duration.value), 0),
        polyline: route.overview_polyline.points,
        bounds: route.bounds
      },
      segments: []
    };

    legs.forEach((leg, index) => {
      const fromOrder = orders[index];
      const toOrder = orders[index + 1];

      directions.segments.push({
        from: {
          orderId: fromOrder.id,
          customerName: fromOrder.customerName,
          address: leg.start_address
        },
        to: {
          orderId: toOrder.id,
          customerName: toOrder.customerName,
          address: leg.end_address
        },
        distance: leg.distance.text,
        duration: leg.duration.text,
        durationInTraffic: leg.duration_in_traffic?.text || leg.duration.text,
        steps: leg.steps.map(step => ({
          instruction: step.html_instructions.replace(/<[^>]*>/g, ''), // Remove HTML tags
          distance: step.distance.text,
          duration: step.duration.text,
          polyline: step.polyline.points,
          maneuver: step.maneuver || 'straight'
        }))
      });
    });

    return directions;
  }

  /**
   * Generate Google Maps URL for route visualization
   */
  generateMapUrl(geocodedRoute) {
    const validOrders = geocodedRoute.filter(order => order.geocoded);

    if (validOrders.length === 0) {
      return null;
    }

    const baseUrl = 'https://www.google.com/maps/dir/';
    const waypoints = validOrders.map(order => 
      `${order.coordinates.latitude},${order.coordinates.longitude}`
    ).join('/');

    return `${baseUrl}${waypoints}`;
  }

  /**
   * Build final route structure for API response
   */
  buildFinalRouteStructure(data) {
    const {
      driverId,
      optimizationResult,
      geocodedRoute,
      routeDetails,
      directions,
      mapUrl,
      options
    } = data;

    return {
      success: true,
      driverId,
      routeInfo: {
        totalOrders: geocodedRoute.length,
        algorithm: optimizationResult.algorithm,
        optimizedAt: optimizationResult.optimizedAt,
        estimatedImprovement: optimizationResult.metadata?.estimatedImprovement || '0%',
        realDistanceCalculated: routeDetails.distanceMatrix ? true : false
      },
      routeMetrics: {
        totalDistance: routeDetails.totalDistanceKm + ' km',
        totalDuration: routeDetails.totalDurationText,
        totalDurationInTraffic: routeDetails.totalDurationInTrafficText,
        estimatedDeliveryTime: Math.ceil(routeDetails.totalDurationInTrafficMinutes + (geocodedRoute.length * 10)) + ' minutes',
        geocodingSuccessRate: routeDetails.geocodingRate
      },
      deliveryStops: routeDetails.detailedStops,
      navigation: {
        directionsAvailable: directions?.available || false,
        mapUrl,
        segments: directions?.segments || [],
        polyline: directions?.overview?.polyline || null
      },
      optimization: {
        algorithm: optimizationResult.algorithm,
        metadata: optimizationResult.metadata,
        originalSequence: optimizationResult.optimizedSequence.map(order => order.sequenceNumber),
        priorityDistribution: this.analyzePriorityDistribution(geocodedRoute)
      },
      generatedAt: new Date().toISOString(),
      options: {
        includeTraffic: options.includeTraffic,
        includeDirections: options.includeDirections,
        algorithm: options.algorithm
      }
    };
  }

  /**
   * Create basic route details when distance calculation fails
   */
  createBasicRouteDetails(orders) {
    const estimatedTimePerOrder = 15; // minutes
    const estimatedDistancePerOrder = 5; // km

    return {
      totalDistanceKm: (orders.length * estimatedDistancePerOrder).toFixed(2),
      totalDurationText: `${orders.length * estimatedTimePerOrder} minutes`,
      totalDurationInTrafficText: `${Math.ceil(orders.length * estimatedTimePerOrder * 1.2)} minutes`,
      detailedStops: orders.map((order, index) => ({
        stopNumber: index + 1,
        orderId: order.id,
        orderNumber: order.orderNumber,
        customerName: order.customerName,
        deliveryAddress: order.deliveryAddress,
        priority: order.priority,
        estimatedArrivalTime: `${(index + 1) * estimatedTimePerOrder} minutes from start`,
        geocoded: order.geocoded || false
      })),
      estimatedData: true,
      geocodingSuccess: orders.filter(o => o.geocoded).length,
      geocodingTotal: orders.length
    };
  }

  /**
   * Analyze priority distribution in the route
   */
  analyzePriorityDistribution(orders) {
    const distribution = { URGENT: 0, HIGH: 0, NORMAL: 0, LOW: 0 };
    
    orders.forEach(order => {
      distribution[order.priority] = (distribution[order.priority] || 0) + 1;
    });

    return distribution;
  }

  /**
   * Format duration from seconds to readable text
   */
  formatDuration(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  }

  /**
   * Validate route builder configuration
   */
  async validateConfiguration() {
    if (!this.googleMapsApiKey) {
      throw new Error('Google Maps API key not configured for Route Builder');
    }

    try {
      // Test basic functionality
      await Geocoder.validateApiKey();
      await DistanceMatrix.validateConfiguration();
      return true;
    } catch (error) {
      throw new Error(`Route Builder configuration invalid: ${error.message}`);
    }
  }
}

module.exports = new RouteBuilder();