const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Remove async from this function - it should return a string directly
function generateTrackingNumber() {
  const year = new Date().getFullYear();
  const randomPart = Math.floor(Math.random() * 900000) + 100000; // 6 digits
  return `RNX-${year}-${randomPart}`;
}

async function generateUniqueTrackingNumber() {
  for (let attempts = 0; attempts < 10; attempts++) {
    const trackingNumber = generateTrackingNumber(); // This now returns a string directly
    
    const existingOrder = await prisma.order.findUnique({
      where: { trackingNumber }
    });
    
    if (!existingOrder) {
      return trackingNumber;
    }
  }
  
  throw new Error('Unable to generate unique tracking number after 10 attempts');
}

async function addTrackingNumbers() {
  try {
    console.log('🔄 Adding tracking numbers to existing orders...');
    
    // Get all orders without tracking numbers
    const ordersWithoutTracking = await prisma.order.findMany({
      where: {
        trackingNumber: null
      },
      select: {
        id: true,
        orderNumber: true
      }
    });

    console.log(`📊 Found ${ordersWithoutTracking.length} orders without tracking numbers`);

    for (const order of ordersWithoutTracking) {
      const trackingNumber = await generateUniqueTrackingNumber();
      
      await prisma.order.update({
        where: { id: order.id },
        data: { trackingNumber }
      });
      
      console.log(`✅ Updated ${order.orderNumber} with tracking number: ${trackingNumber}`);
    }

    console.log('🎉 All existing orders now have tracking numbers!');
    
  } catch (error) {
    console.error('❌ Error adding tracking numbers:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addTrackingNumbers();