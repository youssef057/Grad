const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const prisma = new PrismaClient();

async function seedAdmin() {
  try {
    console.log('🌱 Starting admin user seeding...');
    
    // Check if admin already exists
    const existingAdmin = await prisma.user.findFirst({
      where: { role: 'ADMIN' }
    });
    
    if (existingAdmin) {
      console.log('✅ Admin user already exists:', existingAdmin.email);
      return;
    }
    
    // Admin user data
    const adminData = {
      email: 'adminx@rnexpress.com',
      password: 'Mrx$100million', // Change this to a secure password
      firstName: 'System',
      lastName: 'Administrator',
      phone: '01065232781'
    };
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(adminData.password, salt);
    
    // Create admin user
    const admin = await prisma.user.create({
      data: {
        email: adminData.email,
        passwordHash,
        firstName: adminData.firstName,
        lastName: adminData.lastName,
        fullName: `${adminData.firstName} ${adminData.lastName}`,
        phone: adminData.phone,
        role: 'ADMIN',
        status: 'ACTIVE',
        isEmailVerified: true, // Skip email verification for admin
            permissions: {
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
        }
      }
    });
    
    console.log('✅ Admin user created successfully!');
    console.log('📧 Email:', admin.email);
    console.log('🔑 Password:', adminData.password);
    console.log('⚠️  Please change the password after first login!');
    
  } catch (error) {
    console.error('❌ Error seeding admin user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seeder
seedAdmin();