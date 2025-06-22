class DistanceMatrix {
  constructor() {
    this.googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY;
    this.baseUrl = 'https://maps.googleapis.com/maps/api/distancematrix/json';
    this.region = process.env.GOOGLE_MAPS_REGION || 'EG';
    this.language = process.env.GOOGLE_MAPS_LANGUAGE || 'ar';
    this.requestTimeout = parseInt(process.env.GOOGLE_API_REQUEST_TIMEOUT) || 5000;
  }

  /**
   * Calculate distance matrix between multiple points
   */
  async calculateDistanceMatrix(origins, destinations, options = {}) {
    try {
      const {
        mode = 'driving',
        units = 'metric',
        avoidTolls = false,
        avoidHighways = false,
        trafficModel = 'best_guess',
        departureTime = 'now'
      } = options;

      // Convert coordinates to strings
      const originsStr = origins.map(coord => `${coord.latitude},${coord.longitude}`).join('|');
      const destinationsStr = destinations.map(coord => `${coord.latitude},${coord.longitude}`).join('|');

      // Build API URL
      const url = new URL(this.baseUrl);
      url.searchParams.append('origins', originsStr);
      url.searchParams.append('destinations', destinationsStr);
      url.searchParams.append('mode', mode);
      url.searchParams.append('units', units);
      url.searchParams.append('language', this.language);
      url.searchParams.append('region', this.region);
      url.searchParams.append('key', this.googleMapsApiKey);

      if (avoidTolls) url.searchParams.append('avoid', 'tolls');
      if (avoidHighways) url.searchParams.append('avoid', 'highways');
      if (mode === 'driving') {
        url.searchParams.append('traffic_model', trafficModel);
        url.searchParams.append('departure_time', departureTime);
      }

      // Make API request
      const response = await fetch(url.toString(), {
        timeout: this.requestTimeout
      });

      const data = await response.json();

      if (data.status === 'OK') {
        return this.processDistanceMatrixResponse(data, origins, destinations);
      } else {
        throw new Error(`Distance Matrix API error: ${data.status} - ${data.error_message || 'Unknown error'}`);
      }

    } catch (error) {
      console.error('Distance matrix calculation error:', error);
      throw new Error(`Failed to calculate distance matrix: ${error.message}`);
    }
  }

  /**
   * Process Google Maps Distance Matrix API response
   */
  processDistanceMatrixResponse(data, origins, destinations) {
    const matrix = [];
    
    data.rows.forEach((row, originIndex) => {
      const originRow = [];
      
      row.elements.forEach((element, destIndex) => {
        if (element.status === 'OK') {
          originRow.push({
            originIndex,
            destinationIndex: destIndex,
            origin: origins[originIndex],
            destination: destinations[destIndex],
            distance: {
              text: element.distance.text,
              value: element.distance.value // meters
            },
            duration: {
              text: element.duration.text,
              value: element.duration.value // seconds
            },
            durationInTraffic: element.duration_in_traffic ? {
              text: element.duration_in_traffic.text,
              value: element.duration_in_traffic.value // seconds
            } : null,
            status: 'OK'
          });
        } else {
          originRow.push({
            originIndex,
            destinationIndex: destIndex,
            origin: origins[originIndex],
            destination: destinations[destIndex],
            distance: null,
            duration: null,
            durationInTraffic: null,
            status: element.status,
            error: `Cannot calculate route: ${element.status}`
          });
        }
      });
      
      matrix.push(originRow);
    });

    return {
      matrix,
      origins,
      destinations,
      totalElements: origins.length * destinations.length,
      successfulCalculations: matrix.flat().filter(elem => elem.status === 'OK').length
    };
  }

  /**
   * Calculate distances between delivery points for route optimization
   */
  async calculateDeliveryDistances(deliveryPoints) {
    try {
      if (deliveryPoints.length < 2) {
        return {
          distances: [],
          totalPoints: deliveryPoints.length,
          message: 'Need at least 2 delivery points for distance calculation'
        };
      }

      // Extract coordinates
      const coordinates = deliveryPoints.map(point => ({
        latitude: point.latitude,
        longitude: point.longitude,
        orderId: point.orderId,
        address: point.address
      }));

      // Calculate distance matrix
      const result = await this.calculateDistanceMatrix(coordinates, coordinates, {
        mode: 'driving',
        trafficModel: 'best_guess',
        departureTime: 'now'
      });

      // Convert to delivery-specific format
      const deliveryDistances = this.formatForRouteOptimization(result, deliveryPoints);

      return {
        distances: deliveryDistances,
        matrix: result.matrix,
        totalPoints: deliveryPoints.length,
        successfulCalculations: result.successfulCalculations,
        calculatedAt: new Date().toISOString()
      };

    } catch (error) {
      console.error('Delivery distance calculation error:', error);
      throw new Error(`Failed to calculate delivery distances: ${error.message}`);
    }
  }

  /**
   * Format distance matrix for route optimization algorithms
   */
  formatForRouteOptimization(distanceResult, deliveryPoints) {
    const formatted = [];

    distanceResult.matrix.forEach((row, i) => {
      row.forEach((element, j) => {
        if (element.status === 'OK' && i !== j) { // Don't include same point distances
          formatted.push({
            fromOrderId: deliveryPoints[i].orderId,
            toOrderId: deliveryPoints[j].orderId,
            fromAddress: deliveryPoints[i].address,
            toAddress: deliveryPoints[j].address,
            distanceMeters: element.distance.value,
            distanceText: element.distance.text,
            durationSeconds: element.duration.value,
            durationText: element.duration.text,
            durationInTrafficSeconds: element.durationInTraffic?.value || element.duration.value,
            durationInTrafficText: element.durationInTraffic?.text || element.duration.text,
            fromIndex: i,
            toIndex: j
          });
        }
      });
    });

    return formatted;
  }

  /**
   * Get shortest distance between two points
   */
  async getDirectDistance(origin, destination, options = {}) {
    try {
      const result = await this.calculateDistanceMatrix([origin], [destination], options);
      
      if (result.matrix[0] && result.matrix[0][0] && result.matrix[0][0].status === 'OK') {
        return {
          distance: result.matrix[0][0].distance,
          duration: result.matrix[0][0].duration,
          durationInTraffic: result.matrix[0][0].durationInTraffic,
          origin,
          destination
        };
      } else {
        throw new Error('Cannot calculate distance between points');
      }
    } catch (error) {
      console.error('Direct distance calculation error:', error);
      throw new Error(`Failed to get direct distance: ${error.message}`);
    }
  }

  /**
   * Calculate total route distance and duration
   */
  calculateRouteTotals(routePoints, distanceMatrix) {
    let totalDistance = 0;
    let totalDuration = 0;
    let totalDurationInTraffic = 0;

    for (let i = 0; i < routePoints.length - 1; i++) {
      const fromIndex = routePoints[i].index;
      const toIndex = routePoints[i + 1].index;
      
      const distanceInfo = distanceMatrix.find(d => 
        d.fromIndex === fromIndex && d.toIndex === toIndex
      );

      if (distanceInfo) {
        totalDistance += distanceInfo.distanceMeters;
        totalDuration += distanceInfo.durationSeconds;
        totalDurationInTraffic += distanceInfo.durationInTrafficSeconds;
      }
    }

    return {
      totalDistanceMeters: totalDistance,
      totalDistanceKm: (totalDistance / 1000).toFixed(2),
      totalDurationSeconds: totalDuration,
      totalDurationMinutes: Math.ceil(totalDuration / 60),
      totalDurationInTrafficSeconds: totalDurationInTraffic,
      totalDurationInTrafficMinutes: Math.ceil(totalDurationInTraffic / 60),
      totalDurationText: this.formatDuration(totalDuration),
      totalDurationInTrafficText: this.formatDuration(totalDurationInTraffic)
    };
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
   * Validate API configuration
   */
  async validateConfiguration() {
    if (!this.googleMapsApiKey) {
      throw new Error('Google Maps API key not configured');
    }

    try {
      // Test with Cairo coordinates
      const testOrigin = { latitude: 30.0444, longitude: 31.2357 };
      const testDestination = { latitude: 30.0626, longitude: 31.2497 };
      
      await this.getDirectDistance(testOrigin, testDestination);
      return true;
    } catch (error) {
      throw new Error(`Distance Matrix API configuration invalid: ${error.message}`);
    }
  }
}

module.exports = new DistanceMatrix();