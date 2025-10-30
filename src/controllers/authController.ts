import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import { PrismaClient, UserRole, OtpType, OtpPurpose } from '@prisma/client';
import { otpService } from '../services/otpService';
import emailService from '../services/emailService';
import { isValidEmail, isValidIndianPhone } from '../utils/otpUtils';

const prisma = new PrismaClient();

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: UserRole;
  };
}

// JWT helper functions
const generateAccessToken = (payload: object): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET not configured');
  }
  
  return jwt.sign(payload, secret);
};

const generateRefreshToken = (payload: object): string => {
  const secret = process.env.JWT_REFRESH_SECRET;
  if (!secret) {
    throw new Error('JWT_REFRESH_SECRET not configured');
  }
  
  return jwt.sign(payload, secret);
};

/**
 * Send OTP for registration/login
 */
export const sendOtp = async (req: Request, res: Response) => {
  try {
    const { email, phone, purpose = 'REGISTRATION' } = req.body;

    // Validate input
    if (!email && !phone) {
      return res.status(400).json({
        success: false,
        message: 'Email or phone number is required',
      });
    }

    if (email && !isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format',
      });
    }

    if (phone && !isValidIndianPhone(phone)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid phone number format',
      });
    }

    // Check rate limiting
    const rateLimitCheck = await otpService.canRequestOtp(email, phone);
    if (!rateLimitCheck.canRequest) {
      return res.status(429).json({
        success: false,
        message: 'Please wait before requesting another OTP',
        nextRequestTime: rateLimitCheck.nextRequestTime,
      });
    }

    // Check max attempts
    const maxAttemptsExceeded = await otpService.isMaxAttemptsExceeded(email, phone);
    if (maxAttemptsExceeded) {
      return res.status(429).json({
        success: false,
        message: 'Maximum OTP attempts exceeded. Please try again after 1 hour.',
      });
    }

    // For registration, check if user already exists
    if (purpose === 'REGISTRATION') {
      const existingUser = await prisma.user.findFirst({
        where: {
          OR: [
            ...(email ? [{ email }] : []),
            ...(phone ? [{ phone }] : []),
          ],
        },
      });

      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: existingUser.email === email ? 'Email already registered' : 'Phone number already registered',
        });
      }
    }

    // For login, check if user exists
    if (purpose === 'LOGIN') {
      const user = await prisma.user.findFirst({
        where: {
          OR: [
            ...(email ? [{ email }] : []),
            ...(phone ? [{ phone }] : []),
          ],
        },
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found. Please register first.',
        });
      }
    }

    // Generate and store OTP
    const otpType = email ? OtpType.EMAIL : OtpType.SMS;
    const { code, expiresAt } = await otpService.createOtp({
      email,
      phone,
      type: otpType,
      purpose: purpose as OtpPurpose,
    });

    // Send OTP via email or SMS
    if (email) {
      await emailService.sendOTP(email, code);
    } else if (phone) {
      // SMS functionality would go here
      // For now, we'll just log it (you can integrate SMS service later)
      console.log(`SMS OTP for ${phone}: ${code}`);
    }

    res.status(200).json({
      success: true,
      message: `OTP sent successfully to your ${email ? 'email' : 'phone'}`,
      expiresAt,
    });

  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send OTP',
    });
  }
};

/**
 * Verify OTP and complete registration
 */
export const verifyOtpAndRegister = async (req: Request, res: Response) => {
  try {
    const { email, phone, code, firstName, lastName, password, role = 'CUSTOMER' } = req.body;

    // Validate required fields
    if (!code || !firstName || !lastName) {
      return res.status(400).json({
        success: false,
        message: 'Code, first name, and last name are required',
      });
    }

    if (!email && !phone) {
      return res.status(400).json({
        success: false,
        message: 'Email or phone number is required',
      });
    }

    // Verify OTP
    const otpType = email ? OtpType.EMAIL : OtpType.SMS;
    const otpVerification = await otpService.verifyOtp({
      email,
      phone,
      code,
      type: otpType,
      purpose: OtpPurpose.REGISTRATION,
    });

    if (!otpVerification.isValid) {
      return res.status(400).json({
        success: false,
        message: otpVerification.message,
      });
    }

    // Check if user already exists (double-check)
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          ...(email ? [{ email }] : []),
          ...(phone ? [{ phone }] : []),
        ],
      },
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists',
      });
    }

    // Hash password if provided
    let hashedPassword;
    if (password) {
      hashedPassword = await bcrypt.hash(password, 12);
    }

    // Create user
    const newUser = await prisma.user.create({
      data: {
        email: email || '',
        phone: phone || '',
        firstName,
        lastName,
        password: hashedPassword,
        role: role as UserRole,
        isVerified: true, // Email/phone is verified through OTP
      },
      select: {
        id: true,
        email: true,
        phone: true,
        firstName: true,
        lastName: true,
        role: true,
        isVerified: true,
        createdAt: true,
      },
    });

    // Generate JWT tokens
    const tokenPayload = {
      id: newUser.id,
      email: newUser.email,
      role: newUser.role,
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    // Send welcome email
    if (email) {
      await emailService.sendWelcomeEmail(email, firstName);
    }

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: {
        user: newUser,
        tokens: {
          accessToken,
          refreshToken,
        },
      },
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Registration failed',
    });
  }
};

/**
 * Verify OTP and login
 */
export const verifyOtpAndLogin = async (req: Request, res: Response) => {
  try {
    const { email, phone, code } = req.body;

    // Validate input
    if (!code) {
      return res.status(400).json({
        success: false,
        message: 'OTP code is required',
      });
    }

    if (!email && !phone) {
      return res.status(400).json({
        success: false,
        message: 'Email or phone number is required',
      });
    }

    // Verify OTP
    const otpType = email ? OtpType.EMAIL : OtpType.SMS;
    const otpVerification = await otpService.verifyOtp({
      email,
      phone,
      code,
      type: otpType,
      purpose: OtpPurpose.LOGIN,
    });

    if (!otpVerification.isValid) {
      return res.status(400).json({
        success: false,
        message: otpVerification.message,
      });
    }

    // Find user
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          ...(email ? [{ email }] : []),
          ...(phone ? [{ phone }] : []),
        ],
      },
      select: {
        id: true,
        email: true,
        phone: true,
        firstName: true,
        lastName: true,
        role: true,
        isVerified: true,
        avatar: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Update verification status if not already verified
    if (!user.isVerified) {
      await prisma.user.update({
        where: { id: user.id },
        data: { isVerified: true },
      });
    }

    // Generate JWT tokens
    const tokenPayload = {
      id: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user,
        tokens: {
          accessToken,
          refreshToken,
        },
      },
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed',
    });
  }
};

/**
 * Login with email and password (traditional login)
 */
export const loginWithPassword = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required',
      });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format',
      });
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        phone: true,
        firstName: true,
        lastName: true,
        role: true,
        isVerified: true,
        avatar: true,
        password: true,
      },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    // Check if user has a password set
    if (!user.password) {
      return res.status(400).json({
        success: false,
        message: 'This account uses OTP login. Please use "Login with OTP" option.',
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    // Generate JWT tokens
    const tokenPayload = {
      id: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: userWithoutPassword,
        tokens: {
          accessToken,
          refreshToken,
        },
      },
    });

  } catch (error) {
    console.error('Password login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed',
    });
  }
};

/**
 * Get user profile (protected route)
 */
export const getProfile = async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        email: true,
        phone: true,
        firstName: true,
        lastName: true,
        avatar: true,
        role: true,
        isVerified: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.status(200).json({
      success: true,
      user,
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user profile',
    });
  }
};

/**
 * Refresh JWT token
 */
export const refreshToken = async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token is required',
      });
    }

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET!) as any;

    // Generate new access token
    const newAccessToken = generateAccessToken({
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
    });

    res.status(200).json({
      success: true,
      accessToken: newAccessToken,
    });

  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(401).json({
      success: false,
      message: 'Invalid refresh token',
    });
  }
};

/**
 * Direct password registration (without OTP)
 */
export const registerWithPassword = async (req: Request, res: Response) => {
  try {
    const { email, phone, password, firstName, lastName, role = 'CUSTOMER' } = req.body;

    // Validate required fields
    if (!email || !password || !firstName) {
      return res.status(400).json({
        success: false,
        message: 'Email, password, and first name are required',
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format',
      });
    }

    // Validate password strength
    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long',
      });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email },
          ...(phone ? [{ phone }] : []),
        ],
      },
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email or phone already exists',
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user data - only include phone if provided
    const userData: any = {
      email,
      password: hashedPassword,
      firstName,
      lastName: lastName || '',
      role: role as any,
      isVerified: false, // Require email verification later if needed
    };

    // Only add phone if provided
    if (phone) {
      userData.phone = phone;
    }

    // Create user
    const newUser = await prisma.user.create({
      data: userData,
      select: {
        id: true,
        email: true,
        phone: true,
        firstName: true,
        lastName: true,
        role: true,
        isVerified: true,
        createdAt: true,
      },
    });

    // Generate JWT tokens
    const tokenPayload = {
      id: newUser.id,
      email: newUser.email,
      role: newUser.role,
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshTokenStr = generateRefreshToken(tokenPayload);

    // Send welcome email
    try {
      await emailService.sendWelcomeEmail(email, firstName);
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError);
      // Don't fail registration if email fails
    }

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: {
        user: newUser,
        tokens: {
          accessToken,
          refreshToken: refreshTokenStr,
        },
      },
    });

  } catch (error) {
    console.error('Password registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Registration failed. Please try again.',
    });
  }
};

/**
 * Verify OTP and Register Seller
 */
export const verifyOtpAndRegisterSeller = async (req: Request, res: Response) => {
  try {
    const { 
      email, 
      otp, 
      firstName, 
      lastName,
      phone,
      businessName,
      businessType,
      gstNumber,
      panNumber,
      address,
      city,
      state,
      pincode,
      bankAccountNumber,
      ifscCode,
      accountHolderName
    } = req.body;

    // Validate required fields
    if (!email || !otp || !firstName || !lastName || !phone || !businessName || !businessType || !panNumber || !address || !city || !state || !pincode) {
      return res.status(400).json({
        success: false,
        message: 'All required fields must be provided',
      });
    }

    // Verify OTP
    const otpVerification = await otpService.verifyOtp({
      email,
      code: otp,
      type: OtpType.EMAIL,
      purpose: OtpPurpose.REGISTRATION,
    });

    if (!otpVerification.isValid) {
      return res.status(400).json({
        success: false,
        message: otpVerification.message || 'Invalid OTP',
      });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email },
          { phone },
        ],
      },
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email or phone already exists',
      });
    }

    // Create seller user with business details
    const newSeller = await prisma.user.create({
      data: {
        email,
        phone,
        firstName,
        lastName,
        role: UserRole.RESELLER,
        isVerified: true,
      },
      select: {
        id: true,
        email: true,
        phone: true,
        firstName: true,
        lastName: true,
        role: true,
        isVerified: true,
        createdAt: true,
      },
    });    // Generate JWT tokens
    const tokenPayload = {
      id: newSeller.id,
      email: newSeller.email,
      role: newSeller.role,
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    // Send welcome email
    try {
      await emailService.sendWelcomeEmail(email, firstName);
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError);
      // Don't fail registration if email fails
    }

    res.status(201).json({
      success: true,
      message: 'Seller registration successful',
      data: {
        user: newSeller,
        tokens: {
          accessToken,
          refreshToken,
        },
      },
    });

  } catch (error) {
    console.error('Seller OTP registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Seller registration failed. Please try again.',
    });
  }
};