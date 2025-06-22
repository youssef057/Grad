const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class Geocoder {
  constructor() {
    this.googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY;
    this.baseUrl = 'https://maps.googleapis.com/maps/api/geocode/json';
  }

  /**
   * Geocode a single address to coordinates
   */
  async geocodeAddress(address) {
    try {
      // Check cache first
      const cached = await this.getCachedCoordinates(address);
      if (cached) {
        return cached;
      }

      // Call Google Maps API
      const response = await fetch(`${this.baseUrl}?address=${encodeURIComponent(address)}&key=${this.googleMapsApiKey}`);
      const data = await response.json();

      if (data.status === 'OK' && data.results.length > 0) {
        const location = data.results[0].geometry.location;
        const coordinates = {
          latitude: location.lat,
          longitude: location.lng,
          formattedAddress: data.results[0].formatted_address,
          isValid: true,
          isGeocoded: true
        };

        // Cache the result
        await this.cacheCoordinates(address, coordinates);
        return coordinates;
      } else {
        // Invalid address
        const invalidResult = {
          latitude: null,
          longitude: null,
          formattedAddress: address,
          isValid: false,
          isGeocoded: false,
          error: data.status
        };

        await this.cacheCoordinates(address, invalidResult);
        return invalidResult;
      }
    } catch (error) {
      console.error('Geocoding error:', error);
      throw new Error(`Failed to geocode address: ${address}`);
    }
  }

  /**
   * Geocode multiple addresses in batch
   */
  async geocodeAddresses(addresses) {
    const results = [];
    
    for (const address of addresses) {
      const result = await this.geocodeAddress(address);
      results.push({
        address: address,
        ...result
      });
      
      // Add delay to respect API rate limits
      await this.delay(100);
    }
    
    return results;
  }

  /**
   * Get cached coordinates for an address
   */
  async getCachedCoordinates(address) {
    try {
      const addressHash = this.createAddressHash(address);
      
      const cached = await prisma.addressGeoCache.findUnique({
        where: { addressHash }
      });

      if (cached) {
        return {
          latitude: cached.latitude,
          longitude: cached.longitude,
          formattedAddress: cached.formattedAddress,
          isValid: cached.isValid,
          isGeocoded: cached.isGeocoded
        };
      }

      return null;
    } catch (error) {
      console.error('Cache retrieval error:', error);
      return null;
    }
  }

  /**
   * Cache coordinates for an address
   */
  async cacheCoordinates(address, coordinates) {
    try {
      const addressHash = this.createAddressHash(address);
      
      await prisma.addressGeoCache.upsert({
        where: { addressHash },
        create: {
          addressHash,
          originalAddress: address,
          formattedAddress: coordinates.formattedAddress,
          latitude: coordinates.latitude,
          longitude: coordinates.longitude,
          isValid: coordinates.isValid,
          isGeocoded: coordinates.isGeocoded,
          geocodedAt: coordinates.isGeocoded ? new Date() : null,
          area: this.extractAreaFromAddress(address),
          governorate: this.extractGovernorateFromAddress(address)
        },
        update: {
          formattedAddress: coordinates.formattedAddress,
          latitude: coordinates.latitude,
          longitude: coordinates.longitude,
          isValid: coordinates.isValid,
          isGeocoded: coordinates.isGeocoded,
          geocodedAt: coordinates.isGeocoded ? new Date() : null
        }
      });
    } catch (error) {
      console.error('Cache storage error:', error);
    }
  }

  /**
   * Create hash for address (for caching)
   */
  createAddressHash(address) {
    const crypto = require('crypto');
    return crypto.createHash('md5').update(address.toLowerCase().trim()).digest('hex');
  }

  /**
   * Extract area from Egyptian address
   */
  extractAreaFromAddress(address) {
    const areas = ['Zamalek', 'Dokki', 'Downtown', 'Maadi', 'Heliopolis', 'Nasr City', 'New Cairo'];
    const foundArea = areas.find(area => address.toLowerCase().includes(area.toLowerCase()));
    return foundArea || 'Unknown';
  }

  /**
   * Extract governorate from Egyptian address
   */
  extractGovernorateFromAddress(address) {
    const governorates = ['Cairo', 'Giza', 'Alexandria', 'Qalyubia'];
    const foundGov = governorates.find(gov => address.toLowerCase().includes(gov.toLowerCase()));
    return foundGov || 'Cairo';
  }

  /**
   * Delay function for API rate limiting
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Validate Google Maps API key
   */
  async validateApiKey() {
    if (!this.googleMapsApiKey) {
      throw new Error('Google Maps API key not configured');
    }

    try {
      const testResponse = await fetch(`${this.baseUrl}?address=Cairo,Egypt&key=${this.googleMapsApiKey}`);
      const data = await testResponse.json();
      
      if (data.status === 'REQUEST_DENIED') {
        throw new Error('Invalid Google Maps API key');
      }
      
      return true;
    } catch (error) {
      throw new Error(`API key validation failed: ${error.message}`);
    }
  }

  /**
   * Get geocache statistics
   */
  async getGeocacheStats() {
    try {
      const total = await prisma.addressGeoCache.count();
      const valid = await prisma.addressGeoCache.count({ where: { isValid: true } });
      const geocoded = await prisma.addressGeoCache.count({ where: { isGeocoded: true } });
      
      return {
        totalAddresses: total,
        validAddresses: valid,
        geocodedAddresses: geocoded,
        cacheHitRate: total > 0 ? ((geocoded / total) * 100).toFixed(2) : "0"
      };
    } catch (error) {
      console.error('Stats error:', error);
      throw new Error('Failed to get geocache statistics');
    }
  }
}

module.exports = new Geocoder();