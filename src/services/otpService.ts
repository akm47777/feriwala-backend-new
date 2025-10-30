import { PrismaClient, OtpType, OtpPurpose } from '@prisma/client';
import { generateOtp, getOtpExpiry, isOtpExpired, DEFAULT_OTP_CONFIG } from '../utils/otpUtils';

const prisma = new PrismaClient();

export interface CreateOtpData {
  email?: string;
  phone?: string;
  userId?: string;
  type: OtpType;
  purpose: OtpPurpose;
  expiryMinutes?: number;
}

export interface VerifyOtpData {
  email?: string;
  phone?: string;
  code: string;
  type: OtpType;
  purpose: OtpPurpose;
}

export class OtpService {
  /**
   * Create and store a new OTP
   */
  async createOtp(data: CreateOtpData): Promise<{ code: string; expiresAt: Date }> {
    const { email, phone, userId, type, purpose, expiryMinutes = DEFAULT_OTP_CONFIG.expiryMinutes } = data;

    // Generate OTP code
    const code = generateOtp();
    const expiresAt = getOtpExpiry(expiryMinutes);

    // Invalidate any existing OTPs for the same purpose
    if (email) {
      await prisma.otp.updateMany({
        where: {
          email,
          type,
          purpose,
          isUsed: false,
        },
        data: {
          isUsed: true,
        },
      });
    }

    if (phone) {
      await prisma.otp.updateMany({
        where: {
          phone,
          type,
          purpose,
          isUsed: false,
        },
        data: {
          isUsed: true,
        },
      });
    }

    // Create new OTP
    const newOtp = await prisma.otp.create({
      data: {
        userId,
        email: email || '',
        phone: phone || '',
        code,
        type,
        purpose,
        expiresAt,
      },
    });

    // DEBUG: Log OTP creation
    console.log('[OTP DEBUG] Created new OTP:', {
      id: newOtp.id,
      email: newOtp.email,
      phone: newOtp.phone,
      code: newOtp.code,
      type: newOtp.type,
      purpose: newOtp.purpose,
      isUsed: newOtp.isUsed,
    });

    return { code, expiresAt };
  }

  /**
   * Verify an OTP code
   */
  async verifyOtp(data: VerifyOtpData): Promise<{ isValid: boolean; userId?: string; message: string }> {
    const { email, phone, code, type, purpose } = data;

    // DEBUG: Log verification attempt
    console.log('[OTP DEBUG] Verification attempt:', {
      email,
      phone,
      code,
      codeType: typeof code,
      codeLength: code?.length,
      type,
      purpose,
    });

    // DEBUG: First check all OTPs for this email without code filter
    const allOtps = await prisma.otp.findMany({
      where: {
        ...(email && { email }),
        ...(phone && { phone }),
        isUsed: false,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 3,
    });
    console.log('[OTP DEBUG] All unused OTPs for this email:', allOtps.map(o => ({
      code: o.code,
      codeType: typeof o.code,
      type: o.type,
      purpose: o.purpose,
      isUsed: o.isUsed,
    })));

    // Find the OTP
    const otp = await prisma.otp.findFirst({
      where: {
        ...(email && { email }),
        ...(phone && { phone }),
        code,
        type,
        purpose,
        isUsed: false,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // DEBUG: Log search result
    console.log('[OTP DEBUG] Found OTP:', otp ? {
      id: otp.id,
      code: otp.code,
      codeType: typeof otp.code,
      isUsed: otp.isUsed,
      type: otp.type,
      purpose: otp.purpose,
      expiresAt: otp.expiresAt,
    } : 'NOT FOUND');

    if (!otp) {
      return {
        isValid: false,
        message: 'Invalid OTP code',
      };
    }

    // Check if expired
    if (isOtpExpired(otp.expiresAt)) {
      // Mark as used to prevent reuse
      await prisma.otp.update({
        where: { id: otp.id },
        data: { isUsed: true },
      });

      return {
        isValid: false,
        message: 'OTP has expired',
      };
    }

    // Mark OTP as used
    await prisma.otp.update({
      where: { id: otp.id },
      data: { isUsed: true },
    });

    return {
      isValid: true,
      userId: otp.userId || undefined,
      message: 'OTP verified successfully',
    };
  }

  /**
   * Clean up expired OTPs (should be run periodically)
   */
  async cleanupExpiredOtps(): Promise<number> {
    const result = await prisma.otp.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: new Date() } },
          { isUsed: true },
        ],
      },
    });

    return result.count;
  }

  /**
   * Check if user can request new OTP (rate limiting)
   */
  async canRequestOtp(email?: string, phone?: string, cooldownMinutes: number = 2): Promise<{ canRequest: boolean; nextRequestTime?: Date }> {
    const recentOtp = await prisma.otp.findFirst({
      where: {
        ...(email && { email }),
        ...(phone && { phone }),
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!recentOtp) {
      return { canRequest: true };
    }

    const cooldownMs = cooldownMinutes * 60 * 1000;
    const timeSinceLastRequest = Date.now() - recentOtp.createdAt.getTime();

    if (timeSinceLastRequest < cooldownMs) {
      const nextRequestTime = new Date(recentOtp.createdAt.getTime() + cooldownMs);
      return {
        canRequest: false,
        nextRequestTime,
      };
    }

    return { canRequest: true };
  }

  /**
   * Get OTP attempts count for rate limiting
   */
  async getOtpAttempts(email?: string, phone?: string, windowMinutes: number = 60): Promise<number> {
    const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000);

    const count = await prisma.otp.count({
      where: {
        ...(email && { email }),
        ...(phone && { phone }),
        createdAt: {
          gte: windowStart,
        },
      },
    });

    return count;
  }

  /**
   * Check if max attempts exceeded
   */
  async isMaxAttemptsExceeded(email?: string, phone?: string, maxAttempts: number = 5, windowMinutes: number = 60): Promise<boolean> {
    const attempts = await this.getOtpAttempts(email, phone, windowMinutes);
    return attempts >= maxAttempts;
  }
}

export const otpService = new OtpService();