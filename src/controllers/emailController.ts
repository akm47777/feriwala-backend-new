import { Request, Response } from 'express'
import emailService from '../services/emailService'

export const sendTestEmail = async (req: Request, res: Response) => {
  try {
    const { to, subject, message } = req.body

    if (!to || !subject || !message) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: to, subject, message'
      })
    }

    await emailService.sendEmail({
      to,
      subject,
      text: message,
      html: `<p>${message}</p>`
    })

    res.json({
      success: true,
      message: 'Email sent successfully'
    })
  } catch (error) {
    console.error('Test email failed:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to send email',
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

export const sendOTP = async (req: Request, res: Response) => {
  try {
    const { email } = req.body

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      })
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString()

    await emailService.sendOTP(email, otp)

    // In a real application, you'd store this OTP in database/cache with expiration
    // For now, we'll just return it (don't do this in production!)
    res.json({
      success: true,
      message: 'OTP sent successfully',
      otp: otp // Remove this in production
    })
  } catch (error) {
    console.error('OTP send failed:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to send OTP',
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

export const sendWelcomeEmail = async (req: Request, res: Response) => {
  try {
    const { email, name } = req.body

    if (!email || !name) {
      return res.status(400).json({
        success: false,
        message: 'Email and name are required'
      })
    }

    await emailService.sendWelcomeEmail(email, name)

    res.json({
      success: true,
      message: 'Welcome email sent successfully'
    })
  } catch (error) {
    console.error('Welcome email failed:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to send welcome email',
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

export const sendOrderConfirmation = async (req: Request, res: Response) => {
  try {
    const { email, orderData } = req.body

    if (!email || !orderData) {
      return res.status(400).json({
        success: false,
        message: 'Email and orderData are required'
      })
    }

    await emailService.sendOrderConfirmation(email, orderData)

    res.json({
      success: true,
      message: 'Order confirmation email sent successfully'
    })
  } catch (error) {
    console.error('Order confirmation email failed:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to send order confirmation email',
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}