import nodemailer from 'nodemailer'

export interface EmailConfig {
  host: string
  port: number
  secure: boolean
  auth: {
    user: string
    pass: string
  }
}

export interface EmailOptions {
  to: string | string[]
  subject: string
  text?: string
  html?: string
  from?: string
}

class EmailService {
  private transporter: nodemailer.Transporter | null = null
  private config: EmailConfig

  constructor() {
    // Zoho SMTP Configuration
    this.config = {
      host: 'smtp.zoho.in',
      port: 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER || 'verify@feriwala.in',
        pass: process.env.SMTP_PASSWORD || 'qe0YM2GN233s'
      }
    }
  }

  private async createTransporter(): Promise<nodemailer.Transporter> {
    if (!this.transporter) {
      this.transporter = nodemailer.createTransport(this.config)
      
      // Verify connection configuration
      try {
        await this.transporter.verify()
        console.log('✅ SMTP connection verified successfully')
      } catch (error) {
        console.error('❌ SMTP connection verification failed:', error)
        throw new Error('Failed to verify SMTP connection')
      }
    }
    
    return this.transporter!
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      const transporter = await this.createTransporter()
      
      const mailOptions = {
        from: options.from || `"Feriwala" <${this.config.auth.user}>`,
        to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
        subject: options.subject,
        text: options.text,
        html: options.html
      }

      const info = await transporter.sendMail(mailOptions)
      console.log('✅ Email sent successfully:', info.messageId)
      return true
    } catch (error) {
      console.error('❌ Email send failed:', error)
      throw error
    }
  }

  async sendOTP(email: string, otp: string): Promise<boolean> {
    const htmlTemplate = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
        <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <h1 style="color: #1976d2; text-align: center; margin-bottom: 30px;">Feriwala</h1>
          
          <h2 style="color: #333; text-align: center;">Verification Code</h2>
          
          <p style="color: #666; font-size: 16px; line-height: 1.5;">
            Your verification code for Feriwala is:
          </p>
          
          <div style="background-color: #f5f5f5; padding: 20px; text-align: center; border-radius: 5px; margin: 20px 0;">
            <span style="font-size: 32px; font-weight: bold; color: #1976d2; letter-spacing: 5px;">${otp}</span>
          </div>
          
          <p style="color: #666; font-size: 14px; line-height: 1.5;">
            This code will expire in 10 minutes. If you didn't request this verification, please ignore this email.
          </p>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          
          <p style="color: #999; font-size: 12px; text-align: center;">
            © 2025 Feriwala. All rights reserved.<br>
            This is an automated message, please do not reply.
          </p>
        </div>
      </div>
    `

    return this.sendEmail({
      to: email,
      subject: 'Your Feriwala Verification Code',
      html: htmlTemplate,
      text: `Your Feriwala verification code is: ${otp}. This code will expire in 10 minutes.`
    })
  }

  async sendWelcomeEmail(email: string, name: string): Promise<boolean> {
    const htmlTemplate = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
        <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <h1 style="color: #1976d2; text-align: center; margin-bottom: 30px;">Welcome to Feriwala! 🎉</h1>
          
          <p style="color: #333; font-size: 18px;">Hi ${name},</p>
          
          <p style="color: #666; font-size: 16px; line-height: 1.5;">
            Welcome to Feriwala - your premier destination for fashion and accessories! We're excited to have you join our community.
          </p>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <h3 style="color: #1976d2; margin-top: 0;">What you can do with Feriwala:</h3>
            <ul style="color: #666; line-height: 1.6;">
              <li>Browse thousands of fashion items</li>
              <li>Enjoy competitive prices and quality products</li>
              <li>Track your orders in real-time</li>
              <li>Get personalized recommendations</li>
              <li>Join our reseller program for additional benefits</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://feriwala.com" style="background-color: #1976d2; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">Start Shopping</a>
          </div>
          
          <p style="color: #666; font-size: 14px; line-height: 1.5;">
            If you have any questions, feel free to reach out to our support team at hello@feriwala.com
          </p>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          
          <p style="color: #999; font-size: 12px; text-align: center;">
            © 2025 Feriwala. All rights reserved.<br>
            📧 hello@feriwala.com | 📞 +91 9876543210
          </p>
        </div>
      </div>
    `

    return this.sendEmail({
      to: email,
      subject: 'Welcome to Feriwala - Your Fashion Journey Begins!',
      html: htmlTemplate,
      text: `Hi ${name}, Welcome to Feriwala! We're excited to have you join our fashion community. Start exploring at feriwala.com`
    })
  }

  async sendOrderConfirmation(email: string, orderData: any): Promise<boolean> {
    const htmlTemplate = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
        <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <h1 style="color: #1976d2; text-align: center; margin-bottom: 30px;">Order Confirmed! 📦</h1>
          
          <p style="color: #333; font-size: 16px;">
            Thank you for your order! Your order has been confirmed and is being processed.
          </p>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <h3 style="color: #1976d2; margin-top: 0;">Order Details:</h3>
            <p style="margin: 5px 0;"><strong>Order ID:</strong> ${orderData.id}</p>
            <p style="margin: 5px 0;"><strong>Total Amount:</strong> ₹${orderData.total}</p>
            <p style="margin: 5px 0;"><strong>Estimated Delivery:</strong> ${orderData.estimatedDelivery}</p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://feriwala.com/orders/${orderData.id}" style="background-color: #1976d2; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">Track Order</a>
          </div>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          
          <p style="color: #999; font-size: 12px; text-align: center;">
            © 2025 Feriwala. All rights reserved.
          </p>
        </div>
      </div>
    `

    return this.sendEmail({
      to: email,
      subject: `Order Confirmation - ${orderData.id}`,
      html: htmlTemplate,
      text: `Your order ${orderData.id} has been confirmed. Total: ₹${orderData.total}. Track at feriwala.com/orders/${orderData.id}`
    })
  }
}

export default new EmailService()