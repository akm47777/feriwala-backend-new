import crypto from 'crypto';

export interface OtpConfig {
  length: number;
  expiryMinutes: number;
  type: 'numeric' | 'alphanumeric';
}

export const DEFAULT_OTP_CONFIG: OtpConfig = {
  length: 6,
  expiryMinutes: 10,
  type: 'numeric'
};

/**
 * Generate a random OTP code
 */
export function generateOtp(config: Partial<OtpConfig> = {}): string {
  const { length, type } = { ...DEFAULT_OTP_CONFIG, ...config };
  
  if (type === 'numeric') {
    // Generate numeric OTP
    const min = Math.pow(10, length - 1);
    const max = Math.pow(10, length) - 1;
    return Math.floor(Math.random() * (max - min + 1) + min).toString();
  } else {
    // Generate alphanumeric OTP
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
}

/**
 * Calculate OTP expiry time
 */
export function getOtpExpiry(minutes: number = DEFAULT_OTP_CONFIG.expiryMinutes): Date {
  const expiry = new Date();
  expiry.setMinutes(expiry.getMinutes() + minutes);
  return expiry;
}

/**
 * Check if OTP is expired
 */
export function isOtpExpired(expiresAt: Date): boolean {
  return new Date() > expiresAt;
}

/**
 * Hash OTP for secure storage (optional security layer)
 */
export function hashOtp(otp: string): string {
  return crypto.createHash('sha256').update(otp).digest('hex');
}

/**
 * Verify hashed OTP
 */
export function verifyHashedOtp(otp: string, hashedOtp: string): boolean {
  return hashOtp(otp) === hashedOtp;
}

/**
 * Generate a secure random token for session management
 */
export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Rate limiting helper - check if too many OTPs requested
 */
export function canRequestOtp(lastRequestTime: Date | null, cooldownMinutes: number = 2): boolean {
  if (!lastRequestTime) return true;
  
  const now = new Date();
  const timeDiff = now.getTime() - lastRequestTime.getTime();
  const cooldownMs = cooldownMinutes * 60 * 1000;
  
  return timeDiff >= cooldownMs;
}

/**
 * Format phone number for SMS (remove special characters, ensure country code)
 */
export function formatPhoneNumber(phone: string, defaultCountryCode: string = '+91'): string {
  // Remove all non-numeric characters
  const cleaned = phone.replace(/\D/g, '');
  
  // Add country code if not present
  if (cleaned.length === 10 && !cleaned.startsWith('91')) {
    return `${defaultCountryCode}${cleaned}`;
  }
  
  if (cleaned.length === 12 && cleaned.startsWith('91')) {
    return `+${cleaned}`;
  }
  
  return phone; // Return as-is if format is unclear
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate Indian phone number
 */
export function isValidIndianPhone(phone: string): boolean {
  const phoneRegex = /^(\+91|91)?[6-9]\d{9}$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
}