import { Router } from 'express';
import {
  sendOtp,
  verifyOtpAndRegister,
  verifyOtpAndLogin,
  loginWithPassword,
  registerWithPassword,
  verifyOtpAndRegisterSeller,
  getProfile,
  refreshToken,
} from '../controllers/authController';
import { authenticateToken } from '../middleware/authMiddleware';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { generateToken } from '@/middleware/auth';

const router = Router();
const prisma = new PrismaClient();

/**
 * Public routes
 */

// Send OTP for registration or login
router.post('/send-otp', sendOtp);

// Register with OTP verification
router.post('/register', verifyOtpAndRegister);

// Register with password (direct registration)
router.post('/register-password', registerWithPassword);

// Register seller with OTP verification
router.post('/verify-otp-seller', verifyOtpAndRegisterSeller);

// Login with OTP verification
router.post('/login', verifyOtpAndLogin);

// Login with email and password
router.post('/login-password', loginWithPassword);

// Refresh JWT token
router.post('/refresh-token', refreshToken);

// Seller signup with email verification
router.post('/seller-signup', async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;

    // Validate input
    if (!name || !email || !phone || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Create user with unverified status
    const user = await prisma.user.create({
      data: {
        name,
        firstName: name.split(' ')[0] || name,
        lastName: name.split(' ').slice(1).join(' ') || '',
        email,
        phone,
        password: hashedPassword,
        role: 'RESELLER', // Seller role is RESELLER in schema
        isVerified: false,
        verificationOTP: otp,
        otpExpiry,
      },
    });

    // TODO: Send OTP email
    console.log(`Verification OTP for ${email}: ${otp}`);

    res.status(201).json({
      success: true,
      message: 'Registration successful! Please verify your email.',
      userId: user.id,
    });
  } catch (error: any) {
    console.error('Seller signup error:', error);
    res.status(500).json({ message: 'Registration failed', error: error.message });
  }
});

// Verify email with OTP
router.post('/verify-email', async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ message: 'Email and OTP are required' });
    }

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.isVerified) {
      return res.status(400).json({ message: 'Email already verified' });
    }

    if (!user.verificationOTP || !user.otpExpiry) {
      return res.status(400).json({ message: 'No verification code found. Please request a new one.' });
    }

    if (user.otpExpiry < new Date()) {
      return res.status(400).json({ message: 'Verification code expired' });
    }

    if (user.verificationOTP !== otp) {
      return res.status(400).json({ message: 'Invalid verification code' });
    }

    // Mark user as verified
    await prisma.user.update({
      where: { email },
      data: {
        isVerified: true,
        verificationOTP: null,
        otpExpiry: null,
      },
    });

    res.json({
      success: true,
      message: 'Email verified successfully!',
    });
  } catch (error: any) {
    console.error('Email verification error:', error);
    res.status(500).json({ message: 'Verification failed', error: error.message });
  }
});

// Resend verification OTP
router.post('/resend-verification', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.isVerified) {
      return res.status(400).json({ message: 'Email already verified' });
    }

    // Generate new OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

    await prisma.user.update({
      where: { email },
      data: {
        verificationOTP: otp,
        otpExpiry,
      },
    });

    // TODO: Send OTP email
    console.log(`New verification OTP for ${email}: ${otp}`);

    res.json({
      success: true,
      message: 'Verification code resent!',
    });
  } catch (error: any) {
    console.error('Resend verification error:', error);
    res.status(500).json({ message: 'Failed to resend code', error: error.message });
  }
});

// Forgot password - send reset OTP
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

    await prisma.user.update({
      where: { email },
      data: {
        resetPasswordOTP: otp,
        resetPasswordOTPExpiry: otpExpiry,
      },
    });

    // TODO: Send OTP email
    console.log(`Password reset OTP for ${email}: ${otp}`);

    res.json({
      success: true,
      message: 'Password reset code sent to your email!',
    });
  } catch (error: any) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: 'Failed to send reset code', error: error.message });
  }
});

// Verify reset OTP
router.post('/verify-reset-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ message: 'Email and OTP are required' });
    }

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!user.resetPasswordOTP || !user.resetPasswordOTPExpiry) {
      return res.status(400).json({ message: 'No reset code found' });
    }

    if (user.resetPasswordOTPExpiry < new Date()) {
      return res.status(400).json({ message: 'Reset code expired' });
    }

    if (user.resetPasswordOTP !== otp) {
      return res.status(400).json({ message: 'Invalid reset code' });
    }

    res.json({
      success: true,
      message: 'Code verified successfully!',
    });
  } catch (error: any) {
    console.error('Verify reset OTP error:', error);
    res.status(500).json({ message: 'Verification failed', error: error.message });
  }
});

// Reset password
router.post('/reset-password', async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!user.resetPasswordOTP || !user.resetPasswordOTPExpiry) {
      return res.status(400).json({ message: 'No reset code found' });
    }

    if (user.resetPasswordOTPExpiry < new Date()) {
      return res.status(400).json({ message: 'Reset code expired' });
    }

    if (user.resetPasswordOTP !== otp) {
      return res.status(400).json({ message: 'Invalid reset code' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password and clear reset OTP
    await prisma.user.update({
      where: { email },
      data: {
        password: hashedPassword,
        resetPasswordOTP: null,
        resetPasswordOTPExpiry: null,
      },
    });

    res.json({
      success: true,
      message: 'Password reset successfully!',
    });
  } catch (error: any) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Failed to reset password', error: error.message });
  }
});

/**
 * Protected routes
 */

// Get user profile
router.get('/profile', authenticateToken, getProfile);

// Logout (optional - can be handled on frontend by clearing tokens)
router.post('/logout', authenticateToken, (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Logged out successfully',
  });
});

export default router;