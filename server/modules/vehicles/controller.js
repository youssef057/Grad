const vehicleService = require('./service');

class VehicleController {
  /**
   * Create a new vehicle
   * @route POST /api/vehicles
   * @access Private/Admin
   */
  async createVehicle(req, res) {
    try {
      const vehicle = await vehicleService.createVehicle(req.body);
      
      res.status(201).json({
        success: true,
        data: vehicle,
        message: 'Vehicle created successfully'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to create vehicle'
      });
    }
  }

  /**
   * Get all vehicles with filters and pagination
   * @route GET /api/vehicles
   * @access Private/Admin
   */
  async getAllVehicles(req, res) {
    try {
      const options = {
        page: req.query.page,
        limit: req.query.limit,
        search: req.query.search,
        type: req.query.type,
        status: req.query.status,
        hasDriver: req.query.hasDriver,
        sortBy: req.query.sortBy,
        sortOrder: req.query.sortOrder
      };

      const result = await vehicleService.getAllVehicles(options);
      
      res.status(200).json({
        success: true,
        data: result.vehicles,
        pagination: result.pagination,
        message: 'Vehicles retrieved successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get vehicles'
      });
    }
  }

  /**
   * Get vehicle by ID
   * @route GET /api/vehicles/:id
   * @access Private/Admin
   */
  async getVehicleById(req, res) {
    try {
      const vehicle = await vehicleService.getVehicleById(req.params.id);
      
      res.status(200).json({
        success: true,
        data: vehicle,
        message: 'Vehicle retrieved successfully'
      });
    } catch (error) {
      const statusCode = error.message === 'Vehicle not found' ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Failed to get vehicle'
      });
    }
  }

  /**
   * Update vehicle information
   * @route PUT /api/vehicles/:id
   * @access Private/Admin
   */
  async updateVehicle(req, res) {
    try {
      const vehicle = await vehicleService.updateVehicle(req.params.id, req.body);
      
      res.status(200).json({
        success: true,
        data: vehicle,
        message: 'Vehicle updated successfully'
      });
    } catch (error) {
      const statusCode = error.message === 'Vehicle not found' ? 404 : 400;
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Failed to update vehicle'
      });
    }
  }

  /**
   * Assign driver to vehicle
   * @route PUT /api/vehicles/:id/assign-driver
   * @access Private/Admin
   */
  async assignDriver(req, res) {
    try {
      const { driverId } = req.body;
      const assignedBy = req.user.id; // Admin who made the assignment
      
      const vehicle = await vehicleService.assignDriver(
        req.params.id, 
        driverId, 
        assignedBy
      );
      
      res.status(200).json({
        success: true,
        data: vehicle,
        message: 'Driver assigned to vehicle successfully'
      });
    } catch (error) {
      const statusCode = error.message.includes('not found') ? 404 : 400;
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Failed to assign driver'
      });
    }
  }

  /**
   * Unassign driver from vehicle
   * @route PUT /api/vehicles/:id/unassign-driver
   * @access Private/Admin
   */
  async unassignDriver(req, res) {
    try {
      const vehicle = await vehicleService.unassignDriver(req.params.id);
      
      res.status(200).json({
        success: true,
        data: vehicle,
        message: 'Driver unassigned from vehicle successfully'
      });
    } catch (error) {
      const statusCode = error.message === 'Vehicle not found' ? 404 : 400;
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Failed to unassign driver'
      });
    }
  }

  /**
   * Update vehicle status
   * @route PUT /api/vehicles/:id/status
   * @access Private/Admin
   */
  async updateVehicleStatus(req, res) {
    try {
      const { status } = req.body;
      const vehicle = await vehicleService.updateVehicleStatus(req.params.id, status);
      
      res.status(200).json({
        success: true,
        data: vehicle,
        message: 'Vehicle status updated successfully'
      });
    } catch (error) {
      const statusCode = error.message === 'Vehicle not found' ? 404 : 400;
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Failed to update vehicle status'
      });
    }
  }

  /**
   * Delete vehicle (soft delete)
   * @route DELETE /api/vehicles/:id
   * @access Private/Admin
   */
  async deleteVehicle(req, res) {
    try {
      const result = await vehicleService.deleteVehicle(req.params.id);
      
      res.status(200).json({
        success: true,
        data: null,
        message: result.message
      });
    } catch (error) {
      const statusCode = error.message === 'Vehicle not found' ? 404 : 400;
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Failed to delete vehicle'
      });
    }
  }

  /**
   * Get vehicle statistics
   * @route GET /api/vehicles/statistics
   * @access Private/Admin
   */
  async getVehicleStatistics(req, res) {
    try {
      const statistics = await vehicleService.getVehicleStatistics();
      
      res.status(200).json({
        success: true,
        data: statistics,
        message: 'Vehicle statistics retrieved successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get vehicle statistics'
      });
    }
  }

  /**
   * Get available vehicles for assignment
   * @route GET /api/vehicles/available
   * @access Private/Admin
   */
  async getAvailableVehicles(req, res) {
    try {
      const vehicles = await vehicleService.getAvailableVehicles();
      
      res.status(200).json({
        success: true,
        data: vehicles,
        message: 'Available vehicles retrieved successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get available vehicles'
      });
    }
  }

  /**
   * Get available drivers for assignment
   * @route GET /api/vehicles/available-drivers
   * @access Private/Admin
   */
  async getAvailableDrivers(req, res) {
    try {
      const drivers = await vehicleService.getAvailableDrivers();
      
      res.status(200).json({
        success: true,
        data: drivers,
        message: 'Available drivers retrieved successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get available drivers'
      });
    }
  }
}

module.exports = new VehicleController();