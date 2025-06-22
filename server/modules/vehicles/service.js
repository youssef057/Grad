const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class VehicleService {
  /**
   * Generate unique vehicle number
   */
  async generateVehicleNumber() {
    const lastVehicle = await prisma.vehicle.findFirst({
      orderBy: { vehicleNumber: 'desc' },
      select: { vehicleNumber: true }
    });

    if (!lastVehicle) {
      return 'VH-001';
    }

    // Extract number from VH-XXX format
    const lastNumber = parseInt(lastVehicle.vehicleNumber.split('-')[1]);
    const nextNumber = (lastNumber + 1).toString().padStart(3, '0');
    return `VH-${nextNumber}`;
  }

  /**
   * Create a new vehicle
   */
  async createVehicle(vehicleData) {
    const { name, nameAr, type, maxUnits, driverId } = vehicleData;

    // Generate unique vehicle number
    const vehicleNumber = await this.generateVehicleNumber();

    // If driver is provided, check if driver exists and is available
    if (driverId) {
      const driver = await prisma.user.findUnique({
        where: { id: driverId, role: 'DRIVER', status: 'ACTIVE' }
      });

      if (!driver) {
        throw new Error('Driver not found or not active');
      }

      // Check if driver is already assigned to another vehicle
      const existingAssignment = await prisma.vehicle.findFirst({
        where: { driverId: driverId, isActive: true }
      });

      if (existingAssignment) {
        throw new Error('Driver is already assigned to another vehicle');
      }
    }

    const vehicle = await prisma.vehicle.create({
      data: {
        name,
        nameAr,
        vehicleNumber,
        type,
        maxUnits: parseInt(maxUnits),
        driverId,
        assignedAt: driverId ? new Date() : null
      },
      include: {
        driver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true
          }
        }
      }
    });

    // Create assignment history record if driver assigned
    if (driverId) {
      await prisma.vehicleAssignment.create({
        data: {
          vehicleId: vehicle.id,
          driverId: driverId,
          assignedBy: 'system' // Will be updated to actual admin ID in controller
        }
      });
    }

    return vehicle;
  }

  /**
   * Get all vehicles with filters and pagination
   */
  async getAllVehicles(options = {}) {
    const {
      page = 1,
      limit = 10,
      search = '',
      type = '',
      status = '',
      hasDriver = null,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = options;

    const skip = (page - 1) * limit;

    // Build where clause
    const where = {
      isActive: true
    };

    // Search in name, nameAr, or vehicleNumber
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { nameAr: { contains: search, mode: 'insensitive' } },
        { vehicleNumber: { contains: search, mode: 'insensitive' } }
      ];
    }

    // Filter by type
    if (type) {
      where.type = type;
    }

    // Filter by status
    if (status) {
      where.status = status;
    }

    // Filter by driver assignment
    if (hasDriver === 'true') {
      where.driverId = { not: null };
    } else if (hasDriver === 'false') {
      where.driverId = null;
    }

    // Get vehicles with count
    const [vehicles, total] = await Promise.all([
      prisma.vehicle.findMany({
        where,
        include: {
          driver: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              fullName: true,
              email: true,
              phone: true,
              driverAvailability: true
            }
          }
        },
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: parseInt(limit)
      }),
      prisma.vehicle.count({ where })
    ]);

    return {
      vehicles,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: parseInt(limit),
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1
      }
    };
  }

  /**
   * Get vehicle by ID
   */
  async getVehicleById(id) {
    const vehicle = await prisma.vehicle.findFirst({
      where: { id, isActive: true },
      include: {
        driver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            fullName: true,
            email: true,
            phone: true,
            driverAvailability: true,
            licenseNumber: true
          }
        },
        assignments: {
          include: {
            driver: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                fullName: true
              }
            }
          },
          orderBy: { assignedAt: 'desc' },
          take: 10 // Last 10 assignments
        }
      }
    });

    if (!vehicle) {
      throw new Error('Vehicle not found');
    }

    return vehicle;
  }

  /**
   * Update vehicle information
   */
  async updateVehicle(id, updateData) {
    const { name, nameAr, type, maxUnits } = updateData;

    // Check if vehicle exists
    const existingVehicle = await prisma.vehicle.findFirst({
      where: { id, isActive: true }
    });

    if (!existingVehicle) {
      throw new Error('Vehicle not found');
    }

    // Update vehicle
    const vehicle = await prisma.vehicle.update({
      where: { id },
      data: {
        name,
        nameAr,
        type,
        maxUnits: maxUnits ? parseInt(maxUnits) : undefined
      },
      include: {
        driver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            fullName: true,
            email: true,
            phone: true
          }
        }
      }
    });

    return vehicle;
  }

  /**
   * Assign driver to vehicle
   */
  async assignDriver(vehicleId, driverId, assignedBy) {
    // Check if vehicle exists and is available
    const vehicle = await prisma.vehicle.findFirst({
      where: { id: vehicleId, isActive: true }
    });

    if (!vehicle) {
      throw new Error('Vehicle not found');
    }

    if (vehicle.driverId) {
      throw new Error('Vehicle is already assigned to a driver. Unassign first.');
    }

    // Check if driver exists and is available
    const driver = await prisma.user.findUnique({
      where: { id: driverId, role: 'DRIVER', status: 'ACTIVE' }
    });

    if (!driver) {
      throw new Error('Driver not found or not active');
    }

    // Check if driver is already assigned to another vehicle
    const existingAssignment = await prisma.vehicle.findFirst({
      where: { driverId: driverId, isActive: true }
    });

    if (existingAssignment) {
      throw new Error('Driver is already assigned to another vehicle');
    }

    // Assign driver to vehicle
    const updatedVehicle = await prisma.vehicle.update({
      where: { id: vehicleId },
      data: {
        driverId: driverId,
        assignedAt: new Date()
      },
      include: {
        driver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            fullName: true,
            email: true,
            phone: true
          }
        }
      }
    });

    // Create assignment history record
    await prisma.vehicleAssignment.create({
      data: {
        vehicleId: vehicleId,
        driverId: driverId,
        assignedBy: assignedBy
      }
    });

    return updatedVehicle;
  }

  /**
   * Unassign driver from vehicle
   */
  async unassignDriver(vehicleId) {
    // Check if vehicle exists
    const vehicle = await prisma.vehicle.findFirst({
      where: { id: vehicleId, isActive: true }
    });

    if (!vehicle) {
      throw new Error('Vehicle not found');
    }

    if (!vehicle.driverId) {
      throw new Error('Vehicle has no assigned driver');
    }

    // Update current assignment record with unassigned date
    await prisma.vehicleAssignment.updateMany({
      where: {
        vehicleId: vehicleId,
        driverId: vehicle.driverId,
        unassignedAt: null
      },
      data: {
        unassignedAt: new Date()
      }
    });

    // Unassign driver from vehicle
    const updatedVehicle = await prisma.vehicle.update({
      where: { id: vehicleId },
      data: {
        driverId: null,
        assignedAt: null
      }
    });

    return updatedVehicle;
  }

  /**
   * Update vehicle status
   */
  async updateVehicleStatus(id, status) {
    // Validate status
    const validStatuses = ['AVAILABLE', 'ON_ROAD', 'OUT_OF_SERVICE'];
    if (!validStatuses.includes(status)) {
      throw new Error('Invalid vehicle status');
    }

    const vehicle = await prisma.vehicle.findFirst({
      where: { id, isActive: true }
    });

    if (!vehicle) {
      throw new Error('Vehicle not found');
    }

    const updatedVehicle = await prisma.vehicle.update({
      where: { id },
      data: { status },
      include: {
        driver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            fullName: true
          }
        }
      }
    });

    return updatedVehicle;
  }

  /**
   * Delete vehicle (soft delete)
   */
  async deleteVehicle(id) {
    const vehicle = await prisma.vehicle.findFirst({
      where: { id, isActive: true }
    });

    if (!vehicle) {
      throw new Error('Vehicle not found');
    }

    // Can't delete if vehicle has active driver assignment
    if (vehicle.driverId) {
      throw new Error('Cannot delete vehicle with assigned driver. Unassign driver first.');
    }

    await prisma.vehicle.update({
      where: { id },
      data: { isActive: false }
    });

    return { message: 'Vehicle deleted successfully' };
  }

  /**
   * Get vehicle statistics
   */
  async getVehicleStatistics() {
    // Get counts by type
    const typeCounts = await prisma.vehicle.groupBy({
      by: ['type'],
      where: { isActive: true },
      _count: { type: true }
    });

    // Get counts by status
    const statusCounts = await prisma.vehicle.groupBy({
      by: ['status'],
      where: { isActive: true },
      _count: { status: true }
    });

    // Get assignment statistics
    const totalVehicles = await prisma.vehicle.count({
      where: { isActive: true }
    });

    const assignedVehicles = await prisma.vehicle.count({
      where: { isActive: true, driverId: { not: null } }
    });

    const unassignedVehicles = totalVehicles - assignedVehicles;

    // Get capacity statistics
    const capacityStats = await prisma.vehicle.aggregate({
      where: { isActive: true },
      _sum: { maxUnits: true, currentUnits: true },
      _avg: { maxUnits: true, currentUnits: true }
    });

    // Recent vehicles
    const recentVehicles = await prisma.vehicle.findMany({
      where: { isActive: true },
      include: {
        driver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            fullName: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 5
    });

    // Format type distribution
    const typeDistribution = {
      MOTORCYCLE: 0,
      TRUCK: 0
    };
    typeCounts.forEach(item => {
      typeDistribution[item.type] = item._count.type;
    });

    // Format status distribution
    const statusDistribution = {
      AVAILABLE: 0,
      ON_ROAD: 0,
      OUT_OF_SERVICE: 0
    };
    statusCounts.forEach(item => {
      statusDistribution[item.status] = item._count.status;
    });

    return {
      overview: {
        totalVehicles,
        assignedVehicles,
        unassignedVehicles,
        utilizationRate: totalVehicles > 0 ? Math.round((assignedVehicles / totalVehicles) * 100) : 0
      },
      typeDistribution,
      statusDistribution,
      capacity: {
        totalCapacity: capacityStats._sum.maxUnits || 0,
        currentLoad: capacityStats._sum.currentUnits || 0,
        averageCapacity: Math.round(capacityStats._avg.maxUnits || 0),
        averageLoad: Math.round(capacityStats._avg.currentUnits || 0)
      },
      recentVehicles
    };
  }

  /**
   * Get available vehicles for assignment
   */
  async getAvailableVehicles() {
    return await prisma.vehicle.findMany({
      where: {
        isActive: true,
        status: 'AVAILABLE',
        driverId: { not: null } // Has assigned driver
      },
      include: {
        driver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            fullName: true,
            driverAvailability: true
          }
        }
      },
      orderBy: { name: 'asc' }
    });
  }

  /**
   * Get available drivers for assignment
   */
  async getAvailableDrivers() {
    return await prisma.user.findMany({
      where: {
        role: 'DRIVER',
        status: 'ACTIVE',
        assignedVehicle: null // Not assigned to any vehicle
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        fullName: true,
        email: true,
        phone: true,
        driverAvailability: true,
        licenseNumber: true
      },
      orderBy: { firstName: 'asc' }
    });
  }
}

module.exports = new VehicleService();