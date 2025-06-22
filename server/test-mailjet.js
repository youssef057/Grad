const Mailjet = require('node-mailjet');
require('dotenv').config();

async function testMailjet() {
  try {
    console.log('Testing Mailjet API credentials...');
    console.log('API Key:', process.env.MAILJET_API_KEY);
    console.log('API Secret exists:', process.env.MAILJET_API_SECRET ? 'Yes' : 'No');
    console.log('From Email:', process.env.EMAIL_FROM);
    
    const mailjet = Mailjet.apiConnect(
      process.env.MAILJET_API_KEY,
      process.env.MAILJET_API_SECRET
    );

    // Test API connection
    const request = mailjet.get('sender').request();
    const result = await request;
    
    console.log('✅ Mailjet API connection successful!');
    console.log('Verified senders:', result.body.Data.length);
    
  } catch (error) {
    console.error('❌ Mailjet API connection failed:');
    console.error('Error message:', error.message);
    if (error.statusCode) {
      console.error('Status code:', error.statusCode);
    }
  }
}

testMailjet();