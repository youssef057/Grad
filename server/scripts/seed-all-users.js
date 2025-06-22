const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const prisma = new PrismaClient();

async function seedAllUsers() {
  try {
    console.log('🌱 Starting complete user seeding...');
    
    const users = [
      
      {
        email: 'merchant@rnexpress.com', 
        password: 'Merchant123!',
        firstName: 'Sara',
        lastName: 'Ahmed',
        phone: '01111111111',
        role: 'MERCHANT',
        companyName: 'ABC Electronics'
      },
      {
        email: 'driver1@rnexpress.com',
        password: 'Driver123!', 
        firstName: 'Ahmed',
        lastName: 'Hassan',
        phone: '01222222222',
        role: 'DRIVER',
        licenseNumber: 'LIC123456',
        deliveryCommission: 30
      },
      {
        email: 'outsource@rnexpress.com',
        password: 'Outsource123!',
        firstName: 'Mohamed', 
        lastName: 'Ali',
        phone: '01333333333',
        role: 'OUTSOURCE',
        companyName: 'Fast Delivery Partners'
      },
     {
        email: 'customer@rnexpress.com',
        password: 'Customer123!',
        firstName: 'Fatma',
        lastName: 'Mohamed',
        phone: '01444444444',
        role: 'CUSTOMER',
        address: '789 Residential Street, Cairo',
        city: 'Cairo',
        state: 'Cairo Governorate',
        country: 'Egypt',
        postalCode: '11511'
      }
    ];
    
    for (const userData of users) {
      // Check if user exists
      const existing = await prisma.user.findFirst({
        where: { email: userData.email }
      });
      
      if (existing) {
        console.log(`✅ ${userData.role} already exists:`, userData.email);
        continue;
      }
      
      // Hash password
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(userData.password, salt);
      
      // Create user
      await prisma.user.create({
        data: {
          email: userData.email,
          passwordHash,
          firstName: userData.firstName,
          lastName: userData.lastName,
          fullName: `${userData.firstName} ${userData.lastName}`,
          phone: userData.phone,
          role: userData.role,
          status: 'ACTIVE',
          isEmailVerified: true,
          companyName: userData.companyName || null,
          licenseNumber: userData.licenseNumber || null,
          deliveryCommission: userData.deliveryCommission || null,
          permissions: getDefaultPermissions(userData.role)
        }
      });
      
      console.log(`✅ ${userData.role} created:`, userData.email);
    }
    
    console.log('🎉 All users seeded successfully!');
    
  } catch (error) {
    console.error('❌ Error seeding users:', error);
  } finally {
    await prisma.$disconnect();
  }
}

function getDefaultPermissions(role) {
  // Same permissions logic as your service
  const permissions = {
    ADMIN: {
      canManageUsers: true,
      canPromoteUsers: true,
      canViewAllUsers: true,
      canManageAllOrders: true,
      canAssignDrivers: true,
      canViewAllOrders: true,
      canManageVehicles: true,
      canAssignVehicles: true,
      canManageRoutes: true,
      canOptimizeRoutes: true,
      canViewReports: true,
      canExportData: true,
      canViewDashboard: true
    },
    MERCHANT: {
      canManageOwnOrders: true,
      canViewOwnOrders: true,
      canViewAssignedDriver: true,
      canViewOwnRoutes: true,
      canViewOwnReports: true,
      canViewDashboard: true
    },
    DRIVER: {
      canManageOwnOrders: true,
      canViewOwnOrders: true,
      canTrackOrders: true,
      canViewOwnReports: true,
      canViewDashboard: true
    },
    OUTSOURCE: {
      canManageAssignedOrders: true,
      canViewAssignedOrders: true,
      canUpdateOrderStatus: true,
      canViewOwnReports: true,
      canViewDashboard: true
    }
  };
  
  return permissions[role] || {};
}

seedAllUsers();