import { z } from 'zod';
import { isValidPhone, normalizePhone } from '../utils/phone';

export const phoneSchema = z
  .string()
  .min(3, 'Phone number is required')
  .transform(normalizePhone);

export const registerSchema = z.object({
  business_name: z.string().min(2, 'Business name must be at least 2 characters'),
  business_phone: phoneSchema,
  name: z.string().min(2, 'Full name is required'),
  email: z.string().email('Invalid email address').optional().or(z.literal('')).nullable(),
  location: z.string().optional().nullable(),
  password: z.string().min(4, 'Password must be at least 4 characters'),
  pin: z.string().optional().or(z.literal('')).nullable(),
});

export const requestOtpSchema = z.object({
  phone: phoneSchema,
});

export const verifyOtpSchema = z.object({
  phone: phoneSchema,
  otp: z.string().min(4, 'OTP must be at least 4 digits'),
});

export const verifyPinSchema = z.object({
  phone: phoneSchema,
  pin: z.string().min(4, 'PIN must be at least 4 digits'),
});

export const resetPinSchema = z.object({
  phone: phoneSchema,
  otp: z.string().min(4, 'OTP must be at least 4 digits'),
  new_pin: z.string().min(4, 'New PIN must be at least 4 digits'),
});

export const checkPhoneSchema = z.object({
  phone: phoneSchema,
});

export const resetPasswordSchema = z.object({
  phone: phoneSchema,
  otp: z.string().min(4, 'OTP code must be at least 4 digits'),
  new_password: z.string().min(4, 'Password must be at least 4 characters'),
  new_pin: z.string().optional().nullable(),
});

export const verifyPasswordSchema = z.object({
  identifier: z.string().min(2, 'Phone or email is required'),
  password: z.string().min(1, 'Password is required'),
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
  logo_url: z.string().optional().nullable(),
  brand_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Must be a valid hex color code').optional(),
  whatsapp_number: z.string().optional().nullable(),
  business_phone: z.string().optional(),
  email: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
});

export const replaceDriverSchema = z.object({
  driver_name: z.string().min(2, 'Driver name is required'),
  driver_phone: phoneSchema,
});
