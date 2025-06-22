const Mailjet = require('node-mailjet');

class EmailService {
  constructor() {
    this.mailjet = Mailjet.apiConnect(
      process.env.MAILJET_API_KEY,
      process.env.MAILJET_API_SECRET
    );
  }

  // Send verification email
  async sendVerificationEmail(user, verificationToken) {
    const verificationUrl = `${process.env.CLIENT_URL}/verify-email?token=${verificationToken}`;

    const request = this.mailjet
      .post('send', { version: 'v3.1' })
      .request({
        Messages: [
          {
            From: {
              Email: process.env.EMAIL_FROM,
              Name: "Logistics Management System"
            },
            To: [
              {
                Email: user.email,
                Name: `${user.firstName} ${user.lastName}`
              }
            ],
            Subject: "Verify Your Email Address",
            HTMLPart: `
              <h1>Welcome to Logistics Management System!</h1>
              <p>Please verify your email address by clicking the link below:</p>
              <a href="${verificationUrl}" target="_blank">Verify Email</a>
              <p>If you did not sign up for an account, please ignore this email.</p>
              <p>This link will expire in 24 hours.</p>
            `,
            TextPart: `Welcome to Logistics Management System! Please verify your email address by visiting this link: ${verificationUrl}`
          }
        ]
      });

    await request;
  }
  
  // Send password reset email
  async sendPasswordResetEmail(user, resetToken) {
    const resetUrl = `${process.env.CLIENT_URL}/reset-password?token=${resetToken}`;

    const request = this.mailjet
      .post('send', { version: 'v3.1' })
      .request({
        Messages: [
          {
            From: {
              Email: process.env.EMAIL_FROM,
              Name: "Logistics Management System"
            },
            To: [
              {
                Email: user.email,
                Name: `${user.firstName} ${user.lastName}`
              }
            ],
            Subject: "Password Reset Request",
            HTMLPart: `
              <h1>Password Reset Request</h1>
              <p>You requested a password reset. Please click the link below to set a new password:</p>
              <a href="${resetUrl}" target="_blank">Reset Password</a>
              <p>If you did not request a password reset, please ignore this email.</p>
              <p>This link will expire in 1 hour.</p>
            `,
            TextPart: `Password Reset Request. Please visit this link to reset your password: ${resetUrl}`
          }
        ]
      });

    await request;
  }
}

module.exports = new EmailService();