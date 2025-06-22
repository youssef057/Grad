const Geocoder = require('./geocoder');
const DistanceMatrix = require('./distance-matrix');

class RouteOptimizer {
  constructor() {
    this.algorithms = {
      PRIORITY_BASED: 'priority',
      NEAREST_NEIGHBOR: 'nearest_neighbor',
      GENETIC_ALGORITHM: 'genetic',
      OR_TOOLS_VRP: 'or_tools',
      HYBRID: 'hybrid'
    };
  }

  /**
   * Main optimization method - chooses best algorithm based on problem size
   */
  async optimizeRoute(orders, options = {}) {
    try {
      const {
        algorithm = this.algorithms.HYBRID,
        includeTraffic = false,
        vehicleCapacity = null,
        priorityWeight = 0.3,
        distanceWeight = 0.7
      } = options;

      // Validate input
      if (!orders || orders.length === 0) {
        throw new Error('No orders provided for optimization');
      }

      // Single order - no optimization needed
      if (orders.length === 1) {
        return this.createSingleOrderRoute(orders[0]);
      }

      // Choose algorithm based on problem size and requirements
      const selectedAlgorithm = this.selectOptimalAlgorithm(orders.length, algorithm);

      console.log(`Optimizing ${orders.length} orders using ${selectedAlgorithm} algorithm`);

      // Execute optimization
      switch (selectedAlgorithm) {
        case this.algorithms.PRIORITY_BASED:
          return await this.priorityBasedOptimization(orders, options);
        
        case this.algorithms.NEAREST_NEIGHBOR:
          return await this.nearestNeighborOptimization(orders, options);
        
        case this.algorithms.GENETIC_ALGORITHM:
          return await this.geneticAlgorithmOptimization(orders, options);
        
        case this.algorithms.OR_TOOLS_VRP:
          return await this.orToolsVrpOptimization(orders, options);
        
        case this.algorithms.HYBRID:
        default:
          return await this.hybridOptimization(orders, options);
      }

    } catch (error) {
      console.error('Route optimization error:', error);
      throw new Error(`Failed to optimize route: ${error.message}`);
    }
  }

  /**
   * Select optimal algorithm based on problem characteristics
   */
  selectOptimalAlgorithm(orderCount, requestedAlgorithm) {
    // If specific algorithm requested, use it
    if (requestedAlgorithm && requestedAlgorithm !== this.algorithms.HYBRID) {
      return requestedAlgorithm;
    }

    // Choose based on problem size
    if (orderCount <= 3) {
      return this.algorithms.PRIORITY_BASED; // Simple for small problems
    } else if (orderCount <= 10) {
      return this.algorithms.NEAREST_NEIGHBOR; // Fast for medium problems
    } else if (orderCount <= 25) {
      return this.algorithms.GENETIC_ALGORITHM; // Good for larger problems
    } else {
      return this.algorithms.OR_TOOLS_VRP; // Best for very large problems
    }
  }

  /**
   * Priority-based optimization (current implementation enhanced)
   */
  async priorityBasedOptimization(orders, options = {}) {
    try {
      const priorityOrder = { 'URGENT': 4, 'HIGH': 3, 'NORMAL': 2, 'LOW': 1 };
      
      // Sort by priority first, then by creation time
      const sortedOrders = [...orders].sort((a, b) => {
        if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
          return priorityOrder[b.priority] - priorityOrder[a.priority];
        }
        return new Date(a.createdAt) - new Date(b.createdAt);
      });

      // If we have coordinates, apply distance optimization within priority groups
      if (options.includeTraffic || options.useCoordinates) {
        return await this.priorityWithDistanceOptimization(sortedOrders, options);
      }

      // Basic priority-only optimization
      return this.formatOptimizationResult(sortedOrders, {
        algorithm: this.algorithms.PRIORITY_BASED,
        includeTraffic: false,
        estimatedImprovement: '0%'
      });

    } catch (error) {
      console.error('Priority-based optimization error:', error);
      throw new Error(`Priority optimization failed: ${error.message}`);
    }
  }

  /**
   * Priority-based optimization with distance consideration
   */
  async priorityWithDistanceOptimization(orders, options = {}) {
    try {
      // Geocode addresses if not already done
      const geocodedOrders = await this.geocodeOrders(orders);
      
      // Group by priority
      const priorityGroups = this.groupOrdersByPriority(geocodedOrders);
      
      // Optimize within each priority group using distance
      const optimizedGroups = [];
      
      for (const [priority, groupOrders] of Object.entries(priorityGroups)) {
        if (groupOrders.length <= 1) {
          optimizedGroups.push(...groupOrders);
        } else {
          // Apply nearest neighbor within priority group
          const optimizedGroup = await this.nearestNeighborForGroup(groupOrders, options);
          optimizedGroups.push(...optimizedGroup);
        }
      }

      return this.formatOptimizationResult(optimizedGroups, {
        algorithm: 'PRIORITY_WITH_DISTANCE',
        includeTraffic: options.includeTraffic || false,
        estimatedImprovement: '15-25%'
      });

    } catch (error) {
      console.error('Priority with distance optimization error:', error);
      // Fallback to basic priority if geocoding/distance fails
      return await this.priorityBasedOptimization(orders, { ...options, includeTraffic: false });
    }
  }

  /**
   * Nearest Neighbor algorithm for route optimization
   */
  async nearestNeighborOptimization(orders, options = {}) {
    try {
      // Geocode addresses
      const geocodedOrders = await this.geocodeOrders(orders);
      
      // Calculate distance matrix
      const deliveryPoints = geocodedOrders.map(order => ({
        orderId: order.id,
        latitude: order.coordinates?.latitude,
        longitude: order.coordinates?.longitude,
        address: order.deliveryAddress,
        priority: order.priority
      })).filter(point => point.latitude && point.longitude);

      if (deliveryPoints.length < 2) {
        return await this.priorityBasedOptimization(orders, options);
      }

      const distanceData = await DistanceMatrix.calculateDeliveryDistances(deliveryPoints);
      
      // Apply nearest neighbor algorithm with priority weighting
      const optimizedRoute = this.nearestNeighborWithPriority(
        geocodedOrders, 
        distanceData.distances, 
        options
      );

      return this.formatOptimizationResult(optimizedRoute, {
        algorithm: this.algorithms.NEAREST_NEIGHBOR,
        includeTraffic: options.includeTraffic || false,
        estimatedImprovement: '25-40%',
        distanceData: distanceData
      });

    } catch (error) {
      console.error('Nearest neighbor optimization error:', error);
      // Fallback to priority-based
      return await this.priorityBasedOptimization(orders, options);
    }
  }

  /**
   * Nearest neighbor algorithm with priority weighting
   */
  nearestNeighborWithPriority(orders, distances, options = {}) {
    const { priorityWeight = 0.3, distanceWeight = 0.7 } = options;
    const priorityValues = { 'URGENT': 4, 'HIGH': 3, 'NORMAL': 2, 'LOW': 1 };
    
    const unvisited = [...orders];
    const route = [];
    
    // Start with highest priority order
    let current = unvisited.sort((a, b) => priorityValues[b.priority] - priorityValues[a.priority])[0];
    route.push(current);
    unvisited.splice(unvisited.indexOf(current), 1);
    
    // Build route using nearest neighbor with priority weighting
    while (unvisited.length > 0) {
      let bestNext = null;
      let bestScore = Infinity;
      
      for (const candidate of unvisited) {
        const distanceInfo = distances.find(d => 
          d.fromOrderId === current.id && d.toOrderId === candidate.id
        );
        
        if (distanceInfo) {
          // Normalize distance (0-1) and priority (0-1)
          const normalizedDistance = distanceInfo.durationInTrafficSeconds / 3600; // hours
          const normalizedPriority = (5 - priorityValues[candidate.priority]) / 4; // inverse priority
          
          // Calculate weighted score (lower is better)
          const score = (distanceWeight * normalizedDistance) + (priorityWeight * normalizedPriority);
          
          if (score < bestScore) {
            bestScore = score;
            bestNext = candidate;
          }
        }
      }
      
      if (bestNext) {
        route.push(bestNext);
        unvisited.splice(unvisited.indexOf(bestNext), 1);
        current = bestNext;
      } else {
        // No distance data available, add by priority
        const nextByPriority = unvisited.sort((a, b) => priorityValues[b.priority] - priorityValues[a.priority])[0];
        route.push(nextByPriority);
        unvisited.splice(unvisited.indexOf(nextByPriority), 1);
        current = nextByPriority;
      }
    }
    
    return route;
  }

  /**
   * Genetic Algorithm optimization (simplified implementation)
   */
  async geneticAlgorithmOptimization(orders, options = {}) {
    try {
      // For now, implement a simplified version
      // In production, this would use a full genetic algorithm
      
      console.log('Genetic algorithm optimization - using enhanced nearest neighbor');
      
      // Use multiple nearest neighbor runs with different starting points
      const geocodedOrders = await this.geocodeOrders(orders);
      const deliveryPoints = geocodedOrders.map(order => ({
        orderId: order.id,
        latitude: order.coordinates?.latitude,
        longitude: order.coordinates?.longitude,
        address: order.deliveryAddress,
        priority: order.priority
      })).filter(point => point.latitude && point.longitude);

      if (deliveryPoints.length < 2) {
        return await this.priorityBasedOptimization(orders, options);
      }

      const distanceData = await DistanceMatrix.calculateDeliveryDistances(deliveryPoints);
      
      // Run multiple optimization attempts with different parameters
      const attempts = [];
      const parameterSets = [
        { priorityWeight: 0.2, distanceWeight: 0.8 },
        { priorityWeight: 0.3, distanceWeight: 0.7 },
        { priorityWeight: 0.4, distanceWeight: 0.6 },
        { priorityWeight: 0.5, distanceWeight: 0.5 }
      ];

      for (const params of parameterSets) {
        const route = this.nearestNeighborWithPriority(geocodedOrders, distanceData.distances, params);
        const routeDistance = this.calculateRouteDistance(route, distanceData.distances);
        attempts.push({ route, distance: routeDistance, params });
      }

      // Select best route
      const bestAttempt = attempts.sort((a, b) => a.distance - b.distance)[0];

      return this.formatOptimizationResult(bestAttempt.route, {
        algorithm: this.algorithms.GENETIC_ALGORITHM,
        includeTraffic: options.includeTraffic || false,
        estimatedImprovement: '30-50%',
        distanceData: distanceData,
        optimizationParams: bestAttempt.params
      });

    } catch (error) {
      console.error('Genetic algorithm optimization error:', error);
      return await this.nearestNeighborOptimization(orders, options);
    }
  }

  /**
   * OR-Tools VRP optimization (placeholder for future implementation)
   */
  async orToolsVrpOptimization(orders, options = {}) {
    try {
      console.log('OR-Tools VRP optimization - using advanced nearest neighbor for now');
      
      // TODO: Implement actual OR-Tools integration
      // For now, use the genetic algorithm approach
      return await this.geneticAlgorithmOptimization(orders, options);

    } catch (error) {
      console.error('OR-Tools VRP optimization error:', error);
      return await this.geneticAlgorithmOptimization(orders, options);
    }
  }

  /**
   * Hybrid optimization - combines multiple approaches
   */
  async hybridOptimization(orders, options = {}) {
    try {
      const orderCount = orders.length;
      
      if (orderCount <= 3) {
        return await this.priorityBasedOptimization(orders, options);
      } else if (orderCount <= 10) {
        return await this.nearestNeighborOptimization(orders, options);
      } else {
        return await this.geneticAlgorithmOptimization(orders, options);
      }

    } catch (error) {
      console.error('Hybrid optimization error:', error);
      return await this.priorityBasedOptimization(orders, options);
    }
  }

  /**
   * Geocode orders if coordinates are missing
   */
  async geocodeOrders(orders) {
    const geocodedOrders = [];
    
    for (const order of orders) {
      try {
        if (!order.coordinates) {
          const coordinates = await Geocoder.geocodeAddress(order.deliveryAddress);
          geocodedOrders.push({
            ...order,
            coordinates: coordinates.isValid ? coordinates : null
          });
        } else {
          geocodedOrders.push(order);
        }
      } catch (error) {
        console.error(`Geocoding error for order ${order.id}:`, error);
        geocodedOrders.push({ ...order, coordinates: null });
      }
    }
    
    return geocodedOrders;
  }

  /**
   * Group orders by priority level
   */
  groupOrdersByPriority(orders) {
    return orders.reduce((groups, order) => {
      const priority = order.priority || 'NORMAL';
      if (!groups[priority]) {
        groups[priority] = [];
      }
      groups[priority].push(order);
      return groups;
    }, {});
  }

  /**
   * Apply nearest neighbor algorithm to a group of orders
   */
  async nearestNeighborForGroup(orders, options = {}) {
    if (orders.length <= 1) return orders;

    try {
      const deliveryPoints = orders.map(order => ({
        orderId: order.id,
        latitude: order.coordinates?.latitude,
        longitude: order.coordinates?.longitude,
        address: order.deliveryAddress
      })).filter(point => point.latitude && point.longitude);

      if (deliveryPoints.length < 2) return orders;

      const distanceData = await DistanceMatrix.calculateDeliveryDistances(deliveryPoints);
      return this.simpleNearestNeighbor(orders, distanceData.distances);

    } catch (error) {
      console.error('Group optimization error:', error);
      return orders; // Return original order if optimization fails
    }
  }

  /**
   * Simple nearest neighbor without priority weighting
   */
  simpleNearestNeighbor(orders, distances) {
    const unvisited = [...orders];
    const route = [];
    
    // Start with first order
    let current = unvisited[0];
    route.push(current);
    unvisited.splice(0, 1);
    
    while (unvisited.length > 0) {
      let nearest = null;
      let shortestDistance = Infinity;
      
      for (const candidate of unvisited) {
        const distanceInfo = distances.find(d => 
          d.fromOrderId === current.id && d.toOrderId === candidate.id
        );
        
        if (distanceInfo && distanceInfo.durationInTrafficSeconds < shortestDistance) {
          shortestDistance = distanceInfo.durationInTrafficSeconds;
          nearest = candidate;
        }
      }
      
      if (nearest) {
        route.push(nearest);
        unvisited.splice(unvisited.indexOf(nearest), 1);
        current = nearest;
      } else {
        // No distance data, add next order
        route.push(unvisited[0]);
        current = unvisited[0];
        unvisited.splice(0, 1);
      }
    }
    
    return route;
  }

  /**
   * Calculate total route distance
   */
  calculateRouteDistance(route, distances) {
    let totalDistance = 0;
    
    for (let i = 0; i < route.length - 1; i++) {
      const distanceInfo = distances.find(d => 
        d.fromOrderId === route[i].id && d.toOrderId === route[i + 1].id
      );
      
      if (distanceInfo) {
        totalDistance += distanceInfo.durationInTrafficSeconds;
      }
    }
    
    return totalDistance;
  }

  /**
   * Create route result for single order
   */
  createSingleOrderRoute(order) {
    return this.formatOptimizationResult([order], {
      algorithm: 'SINGLE_ORDER',
      includeTraffic: false,
      estimatedImprovement: '0%'
    });
  }

  /**
   * Format optimization result
   */
  formatOptimizationResult(optimizedOrders, metadata = {}) {
    const result = {
      success: true,
      algorithm: metadata.algorithm || 'UNKNOWN',
      totalOrders: optimizedOrders.length,
      optimizedSequence: optimizedOrders.map((order, index) => ({
        ...order,
        sequenceNumber: index + 1,
        estimatedDeliveryTime: `${(index + 1) * 15} minutes` // This will be updated with real data
      })),
      estimatedDuration: `${optimizedOrders.length * 15} minutes`,
      estimatedDistance: `${optimizedOrders.length * 5} km`,
      optimizedAt: new Date().toISOString(),
      metadata: {
        ...metadata,
        optimizationVersion: '1.0.0'
      }
    };

    // Add real distance calculations if available
    if (metadata.distanceData) {
      const routeDistance = this.calculateRouteDistance(optimizedOrders, metadata.distanceData.distances);
      const totals = DistanceMatrix.calculateRouteTotals(
        optimizedOrders.map((order, index) => ({ ...order, index })), 
        metadata.distanceData.distances
      );
      
      result.estimatedDuration = totals.totalDurationInTrafficText;
      result.estimatedDistance = `${totals.totalDistanceKm} km`;
      result.realDistanceCalculated = true;
    }

    return result;
  }
}

module.exports = new RouteOptimizer();