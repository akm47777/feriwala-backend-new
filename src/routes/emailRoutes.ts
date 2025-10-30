import { Router } from 'express'
import {
  sendTestEmail,
  sendOTP,
  sendWelcomeEmail,
  sendOrderConfirmation
} from '../controllers/emailController'

const router = Router()

/**
 * @route POST /api/email/test
 * @desc Send a test email
 * @body { to: string, subject: string, message: string }
 */
router.post('/test', sendTestEmail)

/**
 * @route POST /api/email/send-otp
 * @desc Send OTP email for verification
 * @body { email: string }
 */
router.post('/send-otp', sendOTP)

/**
 * @route POST /api/email/welcome
 * @desc Send welcome email to new users
 * @body { email: string, name: string }
 */
router.post('/welcome', sendWelcomeEmail)

/**
 * @route POST /api/email/order-confirmation
 * @desc Send order confirmation email
 * @body { email: string, orderData: object }
 */
router.post('/order-confirmation', sendOrderConfirmation)

export default router