import { z } from 'zod';
import { isValidPhone, normalizePhone } from '../utils/phone';

export const phoneSchema = z.string().refine(isValidPhone, {
  message: 'Invalid phone number format. Must be valid Tanzanian phone (e.g., 0712345678, +255712345678).',
}).transform(normalizePhone);

export const registerSchema = z.object({
  business_name: z.string().min(2, 'Business name must be at least 2 characters'),
  business_phone: phoneSchema,
  name: z.string().min(2, 'Full name is required'),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  location: z.string().optional(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  pin: z.string().length(4, 'PIN must be exactly 4 digits').regex(/^\d{4}$/, 'PIN must be digits only').optional(),
});

export const requestOtpSchema = z.object({
  phone: phoneSchema,
});

export const verifyOtpSchema = z.object({
  phone: phoneSchema,
  otp: z.string().length(6, 'OTP must be exactly 6 digits').regex(/^\d{6}$/, 'OTP must be digits only'),
});

export const createDeliverySchema = z.object({
  customer_phone: phoneSchema,
  delivery_address: z.string().min(3, 'Delivery address is required'),
  product_description: z.string().min(2, 'Product description is required'),
  driver_name: z.string().min(2, 'Driver name is required'),
  driver_phone: phoneSchema,
});

export const updateBrandingSchema = z.object({
  business_name: z.string().min(2).optional(),
  logo_url: z.string().url().optional().or(z.literal('')),
  brand_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Must be a valid hex color code').optional(),
  whatsapp_number: z.string().optional(),
});

export const replaceDriverSchema = z.object({
  driver_name: z.string().min(2, 'Driver name is required'),
  driver_phone: phoneSchema,
});
